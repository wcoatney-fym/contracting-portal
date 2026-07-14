import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    const locationId = payload.locationId || payload.location_id || null;

    if (!locationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing locationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up agency by GHL location (existing per-agency configs)
    const { data: config } = await supabase
      .from("agency_ghl_configs")
      .select("agency_id, hierarchy_agencies(id, name)")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    // Also check the pipeline-specific config
    const { data: pipelineConfig } = await supabase
      .from("agent_pipeline_ghl_config")
      .select("ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!config && !pipelineConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "No agency mapped to this location" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract opportunity data
    const opportunity = payload.opportunity || payload;
    const ghlOpportunityId = opportunity.id || null;

    if (!ghlOpportunityId) {
      return new Response(
        JSON.stringify({ success: true, message: "No opportunity ID in payload, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the stage name from the payload
    const stageName =
      opportunity.pipelineStageName ||
      opportunity.pipeline_stage_name ||
      opportunity.stageName ||
      opportunity.stage_name ||
      null;

    if (!stageName) {
      return new Response(
        JSON.stringify({ success: true, message: "No stage name in payload, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the internal stage from the mapping table
    const { data: stageMapping } = await supabase
      .from("agent_pipeline_stage_map")
      .select("internal_stage, ghl_stage_id")
      .eq("ghl_stage_name", stageName)
      .maybeSingle();

    if (!stageMapping) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Unknown stage name "${stageName}", skipping`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-learn GHL stage ID from incoming webhook if not already stored
    const incomingGhlStageId = opportunity.pipelineStageId || opportunity.pipeline_stage_id || null;
    if (incomingGhlStageId && !stageMapping.ghl_stage_id) {
      await supabase
        .from("agent_pipeline_stage_map")
        .update({ ghl_stage_id: incomingGhlStageId })
        .eq("ghl_stage_name", stageName);
    }

    // Extract contact info
    const contact = opportunity.contact || {};
    const contactName = contact.name || opportunity.name || "";
    const nameParts = contactName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const agencyName =
      config ? (config.hierarchy_agencies as { id: string; name: string } | null)?.name || null : null;
    const agencyId = config ? config.agency_id : null;

    // Check if the record already exists (for loop detection)
    const { data: existing } = await supabase
      .from("agent_pipeline")
      .select("stage, last_updated_by, ghl_sync_status")
      .eq("ghl_opportunity_id", ghlOpportunityId)
      .maybeSingle();

    // LOOP GUARD: if stage matches, was last updated by UI, and is synced,
    // this is the echo bounce-back from our own push -- skip it
    if (
      existing &&
      existing.stage === stageMapping.internal_stage &&
      existing.last_updated_by === "ui" &&
      existing.ghl_sync_status === "synced"
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Echo detected (UI push bounce-back), skipping",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stageChanged = !existing || existing.stage !== stageMapping.internal_stage;

    const pipelineData: Record<string, unknown> = {
      ghl_opportunity_id: ghlOpportunityId,
      ghl_pipeline_id: opportunity.pipelineId || opportunity.pipeline_id || null,
      ghl_stage_id: incomingGhlStageId,
      stage: stageMapping.internal_stage,
      agent_name: contactName,
      first_name: firstName,
      last_name: lastName,
      email: contact.email || opportunity.email || null,
      phone: contact.phone || opportunity.phone || null,
      agency: agencyName,
      agency_id: agencyId,
      last_updated_by: "ghl_webhook",
      ghl_sync_status: "synced",
      updated_at: new Date().toISOString(),
    };

    if (stageChanged) {
      pipelineData.stage_entered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("agent_pipeline")
      .upsert(pipelineData, { onConflict: "ghl_opportunity_id" });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Agent "${contactName}" ${existing ? "updated to" : "added at"} stage "${stageMapping.internal_stage}"`,
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
