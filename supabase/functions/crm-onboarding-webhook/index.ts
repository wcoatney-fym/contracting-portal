import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * crm-onboarding-webhook — Thin proxy that forwards roster payloads.
 *
 * Previously proxied to a Zapier webhook (broken). Now forwards to the
 * crm-roster-ghl-sync edge function which calls GHL APIs directly.
 *
 * The FYM App calls this function; it passes through to the sync function
 * so the caller contract stays identical.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Self-invoke: call the sibling edge function in the same Supabase project
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GHL_SYNC_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/crm-roster-ghl-sync`
  : "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.ping) {
      return new Response(
        JSON.stringify({ success: true, warm: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pass the payload through to the GHL sync function
    const payload = {
      seatNumber: body.seatNumber,
      agentNpn: body.agentNpn || "",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || "",
      phone: body.phone,
      profileImage: body.profileImage || "",
      crmNumber: body.crmNumber || "",
      agency: body.agency || "",
      digitalBusinessCardUrl: body.digitalBusinessCardUrl || "",
      confirmationPageUrl: body.confirmationPageUrl || "",
      calendarEmbedCode: body.calendarEmbedCode || "",
      action: body.action || "add",
    };

    if (!GHL_SYNC_URL) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SUPABASE_URL not configured — cannot reach crm-roster-ghl-sync",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const syncResponse = await fetch(GHL_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const syncResult = await syncResponse.json();

    return new Response(
      JSON.stringify({
        success: syncResult.success ?? syncResponse.ok,
        status: syncResponse.status,
        ...syncResult,
      }),
      {
        status: syncResponse.ok ? 200 : syncResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
