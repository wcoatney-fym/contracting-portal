import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GHL_BASE = "https://services.leadconnectorhq.com";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { record_id, new_stage, updated_by, updated_by_source } = await req.json();

    // Attribution: default based on source, overridable by caller
    const attributedTo: string = updated_by ?? (updated_by_source === 'training_hub' ? 'Bianca' : 'Tracey');
    const displayName: string = attributedTo;
    const source: string = updated_by_source ?? 'contracting_portal';

    if (!record_id || !new_stage) {
      return new Response(
        JSON.stringify({ success: false, error: "record_id and new_stage are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the pipeline record
    const { data: record, error: recordErr } = await supabase
      .from("agent_pipeline")
      .select("*")
      .eq("id", record_id)
      .maybeSingle();

    if (recordErr || !record) {
      return new Response(
        JSON.stringify({ success: false, error: "Pipeline record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GHL config
    const { data: config } = await supabase
      .from("agent_pipeline_ghl_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!config || !config.ghl_api_key || !config.ghl_location_id || !config.ghl_pipeline_id) {
      // No GHL config -- update locally only
      const { data: updated, error: updateErr } = await supabase
        .from("agent_pipeline")
        .update({
          stage: new_stage,
          last_updated_by: displayName,
          last_updated_by_display: displayName,
          updated_by_source: source,
          ghl_sync_status: "synced",
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", record_id)
        .select()
        .maybeSingle();

      if (updateErr) {
        return new Response(
          JSON.stringify({ success: false, error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, record: updated, ghl_pushed: false, reason: "no_config" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target GHL stage ID from the stage map
    const { data: stageMap } = await supabase
      .from("agent_pipeline_stage_map")
      .select("ghl_stage_id, ghl_stage_name")
      .eq("internal_stage", new_stage)
      .maybeSingle();

    if (!stageMap || !stageMap.ghl_stage_id) {
      // No GHL stage mapping -- update locally only
      const { data: updated } = await supabase
        .from("agent_pipeline")
        .update({
          stage: new_stage,
          last_updated_by: displayName,
          last_updated_by_display: displayName,
          updated_by_source: source,
          ghl_sync_status: "synced",
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", record_id)
        .select()
        .maybeSingle();

      return new Response(
        JSON.stringify({ success: true, record: updated, ghl_pushed: false, reason: "no_stage_mapping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as pushing
    await supabase
      .from("agent_pipeline")
      .update({ ghl_sync_status: "pushing" })
      .eq("id", record_id);

    const ghlHeaders = {
      Authorization: `Bearer ${config.ghl_api_key}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };

    // Strategy: use the stored ghl_opportunity_id to update directly
    let opportunityId = record.ghl_opportunity_id;
    let matchedByPhone = false;

    // If the opportunity ID looks like it might be stale or we need phone match,
    // search by phone to find the correct opportunity
    if (record.phone) {
      const normalizedPhone = normalizePhone(record.phone);
      const searchUrl = `${GHL_BASE}/opportunities/search?location_id=${config.ghl_location_id}&pipeline_id=${config.ghl_pipeline_id}&q=${encodeURIComponent(normalizedPhone)}`;

      const searchRes = await fetch(searchUrl, { headers: ghlHeaders });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const opportunities = searchData.opportunities || [];

        // Find opportunity matching by phone
        const matched = opportunities.find((opp: { contact?: { phone?: string } }) => {
          const oppPhone = normalizePhone(opp.contact?.phone || "");
          return oppPhone && (oppPhone === normalizedPhone || oppPhone.endsWith(normalizedPhone.slice(-10)) || normalizedPhone.endsWith(oppPhone.slice(-10)));
        });

        if (matched) {
          opportunityId = matched.id;
          matchedByPhone = true;
        }
      }
    }

    // Push stage change to GHL
    const updateUrl = `${GHL_BASE}/opportunities/${opportunityId}`;
    const updatePayload = {
      pipelineId: config.ghl_pipeline_id,
      pipelineStageId: stageMap.ghl_stage_id,
    };

    const pushRes = await fetch(updateUrl, {
      method: "PUT",
      headers: ghlHeaders,
      body: JSON.stringify(updatePayload),
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();

      // Revert sync status on failure
      await supabase
        .from("agent_pipeline")
        .update({ ghl_sync_status: "synced" })
        .eq("id", record_id);

      // Log the failed push
      await supabase.from("webhook_log").insert({
        source: "push-pipeline-stage",
        event_type: "push_failed",
        payload: { record_id, new_stage, opportunity_id: opportunityId, error: errText.slice(0, 500) },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `GHL API returned ${pushRes.status}: ${errText.slice(0, 200)}`,
          ghl_pushed: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success -- update local record
    const { data: updated } = await supabase
      .from("agent_pipeline")
      .update({
        stage: new_stage,
        ghl_stage_id: stageMap.ghl_stage_id,
        last_updated_by: displayName,
        last_updated_by_display: displayName,
        updated_by_source: source,
        ghl_sync_status: "synced",
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", record_id)
      .select()
      .maybeSingle();

    // Log successful push
    await supabase.from("webhook_log").insert({
      source: "push-pipeline-stage",
      event_type: "push_success",
      payload: { record_id, new_stage, opportunity_id: opportunityId, matched_by_phone: matchedByPhone },
    });

    return new Response(
      JSON.stringify({ success: true, record: updated, ghl_pushed: true }),
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
