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
    const eventType = payload.type || payload.event || null;

    if (!locationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing locationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: config } = await supabase
      .from("agency_ghl_configs")
      .select("agency_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: "No agency mapped to this location" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const opportunity = payload.opportunity || payload;
    const ghlDealId = opportunity.id || null;

    if (!ghlDealId) {
      return new Response(
        JSON.stringify({ success: true, message: "No deal ID in payload, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = opportunity.status === "won"
      ? "won"
      : opportunity.status === "lost"
      ? "lost"
      : opportunity.status === "abandoned"
      ? "abandoned"
      : "open";

    const dealData = {
      agency_id: config.agency_id,
      ghl_deal_id: ghlDealId,
      deal_name: opportunity.name || "Untitled Deal",
      contact_name: opportunity.contact?.name || null,
      value: opportunity.monetaryValue || 0,
      stage: opportunity.pipelineStageId || "",
      status,
      assigned_agent_name: opportunity.assignedTo || null,
      close_date: opportunity.closedDate || null,
      source: opportunity.source || null,
      synced_at: new Date().toISOString(),
    };

    await supabase
      .from("agency_deals")
      .upsert(dealData, { onConflict: "ghl_deal_id" });

    return new Response(
      JSON.stringify({ success: true, message: "Deal upserted" }),
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
