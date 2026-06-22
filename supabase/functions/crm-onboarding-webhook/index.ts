import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ZAPIER_URL =
  "https://hooks.zapier.com/hooks/catch/25274165/unxjqso/";

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
    };

    const zapierResponse = await fetch(ZAPIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({
        success: zapierResponse.ok,
        status: zapierResponse.status,
      }),
      {
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
