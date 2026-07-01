import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const PAGE_LIMIT = 20;
const MAX_PAGES = 50;
const PAGE_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GhlOpportunity {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  contact?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load pipeline GHL config
    const { data: config, error: configErr } = await supabase
      .from("agent_pipeline_ghl_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (configErr || !config) {
      return new Response(
        JSON.stringify({ success: false, error: "No GHL config found. Configure settings first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ghl_api_key, ghl_location_id, ghl_pipeline_id } = config;

    if (!ghl_api_key || !ghl_location_id || !ghl_pipeline_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete GHL config (missing API key, location, or pipeline ID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      Authorization: `Bearer ${ghl_api_key}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };

    // Load stage map: ghl_stage_id -> internal_stage
    const { data: stageMaps } = await supabase
      .from("agent_pipeline_stage_map")
      .select("ghl_stage_id, internal_stage");

    const stageIdToInternal: Record<string, string> = {};
    for (const sm of stageMaps || []) {
      if (sm.ghl_stage_id) {
        stageIdToInternal[sm.ghl_stage_id] = sm.internal_stage;
      }
    }

    // Also check agency_ghl_configs to find agency name from location
    const { data: agencyConfig } = await supabase
      .from("agency_ghl_configs")
      .select("agency_id, crm_agencies(id, name)")
      .eq("ghl_location_id", ghl_location_id)
      .maybeSingle();

    const agencyName = agencyConfig
      ? (agencyConfig.crm_agencies as { id: string; name: string } | null)?.name || null
      : null;
    const agencyId = agencyConfig ? agencyConfig.agency_id : null;

    // Fetch all opportunities from the pipeline
    const allOpportunities: GhlOpportunity[] = [];
    let startAfterId: string | undefined;
    let pageCount = 0;

    while (pageCount < MAX_PAGES) {
      let url = `${GHL_BASE}/opportunities/search?location_id=${ghl_location_id}&pipeline_id=${ghl_pipeline_id}&limit=${PAGE_LIMIT}`;
      if (startAfterId) {
        url += `&startAfterId=${startAfterId}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("retry-after") || "3", 10);
          await sleep(retryAfter * 1000);
          continue;
        }
        const text = await res.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `GHL API error ${res.status}: ${text}`,
            fetched: allOpportunities.length,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const opportunities: GhlOpportunity[] = data.opportunities || [];

      if (opportunities.length === 0) break;

      allOpportunities.push(...opportunities);
      startAfterId = opportunities[opportunities.length - 1].id;
      pageCount++;

      if (opportunities.length < PAGE_LIMIT) break;

      await sleep(PAGE_DELAY_MS);
    }

    if (allOpportunities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No opportunities found in GHL pipeline", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map and upsert into agent_pipeline
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const opp of allOpportunities) {
      const ghlStageId = opp.pipelineStageId || null;
      const internalStage = ghlStageId ? stageIdToInternal[ghlStageId] : null;

      if (!internalStage) {
        skipped++;
        continue;
      }

      const contact = opp.contact || {};
      const contactName = contact.name || opp.name || "";
      const nameParts = contactName.split(" ");
      const firstName = contact.firstName || nameParts[0] || "";
      const lastName = contact.lastName || nameParts.slice(1).join(" ") || "";

      const pipelineData = {
        ghl_opportunity_id: opp.id,
        ghl_pipeline_id: opp.pipelineId || ghl_pipeline_id,
        ghl_stage_id: ghlStageId,
        stage: internalStage,
        agent_name: contactName || `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        email: contact.email || null,
        phone: contact.phone || null,
        agency: agencyName,
        agency_id: agencyId,
        last_updated_by: "ghl_sync",
        ghl_sync_status: "synced",
        updated_at: new Date().toISOString(),
        stage_entered_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("agent_pipeline")
        .upsert(pipelineData, { onConflict: "ghl_opportunity_id" });

      if (upsertErr) {
        errors.push(`${opp.id}: ${upsertErr.message}`);
      } else {
        synced++;
      }
    }

    // Update connection status
    await supabase
      .from("agent_pipeline_ghl_config")
      .update({ connection_status: "connected", last_error: null, updated_at: new Date().toISOString() })
      .eq("id", config.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${synced} opportunities from GHL pipeline`,
        synced,
        skipped,
        total_fetched: allOpportunities.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
