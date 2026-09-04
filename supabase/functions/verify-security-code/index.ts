import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * verify-security-code — Server-side security code validation for intake forms.
 *
 * Validates the 6-digit security code against the `agent_security_codes`
 * barrier table (anon-unreadable). The code never lives in a table that
 * anon can SELECT from.
 *
 * On success:
 *  - Validates expiration
 *  - Updates status from 'pending' → 'in-progress' (if applicable)
 *  - Logs form access in activity_log
 *  - Returns the agent record (including security_code, since the caller
 *    already proved they know it — forms include it in submission payloads)
 *
 * Pattern: same as verify-portal-password + agent_intake_safe
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ valid: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { formId, securityCode } = await req.json();

    if (
      !formId ||
      typeof formId !== "string" ||
      !securityCode ||
      typeof securityCode !== "string"
    ) {
      return new Response(
        JSON.stringify({ valid: false, error: "formId and securityCode required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize securityCode — digits only, exactly 6
    const cleanCode = securityCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      return new Response(
        JSON.stringify({ valid: false, error: "Security code must be 6 digits" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize formId — UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid formId format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Validate the code against the barrier table (anon-unreadable)
    const { data: codeRow, error: codeError } = await supabase
      .from("agent_security_codes")
      .select("security_code")
      .eq("agent_id", formId)
      .maybeSingle();

    if (codeError || !codeRow || codeRow.security_code !== cleanCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid security code" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 2: Fetch the agent record (code validated, now get the full row)
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", formId)
      .maybeSingle();

    if (fetchError || !agent) {
      return new Response(
        JSON.stringify({ valid: false, error: "Agent not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Attach security_code to the agent response (caller proved they know it;
    // forms need it in submission payloads). Once the column is dropped from
    // agents, this is the only way the code reaches the frontend.
    agent.security_code = cleanCode;

    // Check expiration
    const now = new Date();
    const expirationDate = new Date(agent.expiration_date);
    if (now > expirationDate) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "This link has expired. Please contact Contracting@teamfym.com",
          expired: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Update status from pending → in-progress and log access
    if (agent.status === "pending") {
      await supabase
        .from("agents")
        .update({ status: "in-progress" })
        .eq("id", agent.id);

      await supabase.from("activity_log").insert({
        agent_id: agent.id,
        action: "form_accessed",
        details: `${agent.first_name} ${agent.last_name} accessed the form`,
      });

      agent.status = "in-progress";
    }

    // Return the agent record. security_code is included because:
    // 1. The caller already proved they know it (submitted it for verification)
    // 2. All 5 form pages include it in their submission payloads
    // 3. Omitting it would break form submissions
    return new Response(
      JSON.stringify({ valid: true, agent }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
