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

// ── DBC lifecycle hook (FYM-App PR #799 rail) ─────────────────────────────
// Portal internal stage → dbc-lifecycle stage key. Stages absent here earn no
// cards (Reactivated/IAA/DNF/Terminated/etc. — locked spec, Charlie 2026-10-22).
const DBC_STAGE_KEYS: Record<string, string> = {
  in_contracting: "in_contracting",
  rts: "rts",
  actively_selling_career: "as_career",
  actively_selling_broker: "as_broker",
};

/**
 * CRM-roster NPN fallback (Charlie, 2026-10-26). Looks up the latest FYM
 * crm_roster upload and matches the pipeline card by email (preferred), then
 * exact first+last name (case/space-insensitive). Deterministic only — no
 * fuzzy matching; unmatched cards skip-and-log as before.
 *
 * Attribution goes to the EXISTING field — agents.npn — never a parallel one
 * (Charlie, 2026-10-26: "attribute the information to the existing NPN field").
 * If the pipeline card isn't linked to an agents row yet, we link it
 * (agent_pipeline.agent_id) when a deterministic email/name match exists.
 */
async function resolveNpnFromCrmRoster(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  record: any,
): Promise<string | null> {
  const { data: upload } = await supabase
    .from("crm_roster_uploads")
    .select("id")
    .eq("agency", "FYM")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!upload) return null;

  const { data: rows } = await supabase
    .from("crm_roster")
    .select("row_data")
    .eq("upload_id", upload.id);
  if (!rows?.length) return null;

  const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const email = norm(record.email);
  const name = norm(record.agent_name || `${record.first_name || ""} ${record.last_name || ""}`);

  // deno-lint-ignore no-explicit-any
  const npnOf = (r: any) => String(r.row_data?.["Agent NPN"] ?? "").trim() || null;
  if (email) {
    for (const r of rows) {
      if (norm(r.row_data?.["Email"]) === email) {
        const hit = npnOf(r);
        if (hit) return hit;
      }
    }
  }
  if (name) {
    for (const r of rows) {
      if (norm(`${r.row_data?.["First Name"] ?? ""} ${r.row_data?.["Last Name"] ?? ""}`) === name) {
        const hit = npnOf(r);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/**
 * Attribute a roster-resolved NPN to the existing agents.npn field.
 * - Card already linked (agent_id set): fill agents.npn only when blank.
 * - Card unlinked: find the agents row deterministically (email, then exact
 *   first+last name), link agent_pipeline.agent_id to it, fill npn when blank.
 * - No agents row at all: nothing to attribute — the NPN is still used for
 *   this card generation, and the gap is logged for a manual/data-repair pass.
 * Never overwrites a non-blank agents.npn.
 */
async function attributeNpnToAgentsRow(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  record: any,
  npn: string,
  log: (eventType: string, payload: Record<string, unknown>) => unknown,
): Promise<void> {
  try {
    let agentId: string | null = record.agent_id ?? null;
    let linked = false;

    if (!agentId) {
      const email = String(record.email ?? "").trim();
      if (email) {
        const { data: byEmail } = await supabase
          .from("agents")
          .select("id")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();
        agentId = byEmail?.id ?? null;
      }
      if (!agentId) {
        const name = String(record.agent_name ?? `${record.first_name || ""} ${record.last_name || ""}`)
          .trim().replace(/\s+/g, " ");
        if (name) {
          const [first, ...rest] = name.split(" ");
          if (first && rest.length) {
            const { data: byName } = await supabase
              .from("agents")
              .select("id")
              .ilike("first_name", first)
              .ilike("last_name", rest.join(" "))
              .limit(1)
              .maybeSingle();
            agentId = byName?.id ?? null;
          }
        }
      }
      if (agentId) {
        const { error: linkErr } = await supabase
          .from("agent_pipeline")
          .update({ agent_id: agentId })
          .eq("id", record.id);
        if (linkErr) {
          await log("dbc_hook_npn_attribution_error", { step: "link_agent_id", error: linkErr.message });
          return;
        }
        linked = true;
      }
    }

    if (!agentId) {
      await log("dbc_hook_npn_unattributed", {
        reason: "no agents row matches this pipeline card (email/name)",
        npn_source: "crm_roster",
      });
      return;
    }

    // Fill the existing field only when blank — never overwrite.
    const { data: existing } = await supabase
      .from("agents")
      .select("npn")
      .eq("id", agentId)
      .maybeSingle();
    if (existing && !(existing.npn ?? "").trim()) {
      const { error: npnErr } = await supabase
        .from("agents")
        .update({ npn })
        .eq("id", agentId);
      await log(npnErr ? "dbc_hook_npn_attribution_error" : "dbc_hook_npn_attributed", {
        agent_id: agentId,
        linked_agent_id: linked,
        ...(npnErr ? { step: "set_agents_npn", error: npnErr.message } : { npn_source: "crm_roster" }),
      });
    } else if (linked) {
      await log("dbc_hook_npn_attributed", { agent_id: agentId, linked_agent_id: true, npn_source: "crm_roster", note: "agents.npn already set; card linked only" });
    }
  } catch (err) {
    try {
      await log("dbc_hook_npn_attribution_error", { error: err instanceof Error ? err.message : String(err) });
    } catch { /* attribution logging must never break the hook */ }
  }
}

/**
 * Fire-and-forget call to FYM-App dbc-lifecycle (action=stage_move) after a
 * successful stage move. NEVER fails the stage push — every outcome (ok, skip,
 * error) is logged to webhook_log as dbc_hook_*. Ships dark: with the
 * FYM_APP_SUPABASE_URL / FYM_APP_SERVICE_ROLE_KEY secrets unset it only logs a
 * skip. dbc-lifecycle itself enforces the kill switches + NPN allowlist.
 */
async function fireDbcLifecycleHook(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  record: any,
  newStage: string,
): Promise<void> {
  // webhook_log columns are function_name/payload/outcome/error_message — the
  // original source/event_type insert silently failed on every call (42703),
  // leaving the hook with zero observability. Fixed 2026-10-23.
  const log = (eventType: string, payload: Record<string, unknown>) =>
    supabase.from("webhook_log").insert({
      function_name: "push-pipeline-stage",
      outcome: eventType,
      error_message: eventType.includes("error") ? String(payload.error ?? payload.response ?? "").slice(0, 500) : null,
      payload: { record_id: record.id, new_stage: newStage, ...payload },
    });

  try {
    const dbcStage = DBC_STAGE_KEYS[newStage];
    if (!dbcStage) return; // stage earns no cards — silent no-op by design

    const appUrl = Deno.env.get("FYM_APP_SUPABASE_URL");
    const appKey = Deno.env.get("FYM_APP_SERVICE_ROLE_KEY");
    if (!appUrl || !appKey) {
      await log("dbc_hook_skipped", { reason: "FYM_APP secrets not set (hook dark)" });
      return;
    }
    if (!record.ghl_contact_id) {
      await log("dbc_hook_skipped", { reason: "no ghl_contact_id on pipeline record" });
      return;
    }

    // NPN resolution (fixed 2026-10-23; roster fallback added 2026-10-26):
    // agent_pipeline.agent_id references agents.id — NOT agent_intake.id.
    // Order: agents.npn → agent_intake.npn (via agent_id) → CRM roster (latest
    // FYM upload: email match, then exact first+last name). A roster hit is
    // attributed to the EXISTING agents.npn field (filled only when blank);
    // unlinked cards get agent_pipeline.agent_id linked to a deterministic
    // agents-row match first. No parallel NPN field (Charlie, 2026-10-26).
    let npn: string | null = null;
    let npnSource: string | null = null;
    if (record.agent_id) {
      const { data: agentRow } = await supabase
        .from("agents")
        .select("npn")
        .eq("id", record.agent_id)
        .maybeSingle();
      npn = agentRow?.npn?.trim() || null;
      if (npn) npnSource = "agents";
      if (!npn) {
        const { data: intake } = await supabase
          .from("agent_intake")
          .select("npn")
          .eq("agent_id", record.agent_id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        npn = intake?.npn?.trim() || null;
        if (npn) npnSource = "agent_intake";
      }
    }
    if (!npn) {
      npn = await resolveNpnFromCrmRoster(supabase, record);
      if (npn) {
        npnSource = "crm_roster";
        await attributeNpnToAgentsRow(supabase, record, npn, log);
      }
    }
    if (!npn) {
      await log("dbc_hook_skipped", { reason: "no NPN resolvable (agents, agent_intake, crm_roster)", agent_id: record.agent_id ?? null });
      return;
    }

    const res = await fetch(`${appUrl.replace(/\/$/, "")}/functions/v1/dbc-lifecycle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${appKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "stage_move",
        agent_npn: npn,
        agent_name: record.agent_name || `${record.first_name || ""} ${record.last_name || ""}`.trim(),
        ghl_contact_id: record.ghl_contact_id,
        stage: dbcStage,
      }),
    });
    const body = await res.json().catch(() => ({}));
    await log(res.ok ? "dbc_hook_ok" : "dbc_hook_error", {
      status: res.status,
      dbc_stage: dbcStage,
      npn_source: npnSource,
      response: JSON.stringify(body).slice(0, 400),
    });
  } catch (err) {
    await log("dbc_hook_error", { error: err instanceof Error ? err.message : String(err) }).catch(() => {});
  }
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

      await fireDbcLifecycleHook(supabase, { ...record, ...updated }, new_stage);

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

    // DBC lifecycle hook — non-blocking, after the stage move succeeded.
    await fireDbcLifecycleHook(supabase, { ...record, ...updated }, new_stage);

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
