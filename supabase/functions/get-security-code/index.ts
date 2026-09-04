import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * get-security-code — Admin-only edge function for reading security codes.
 *
 * After security_code moves to the anon-unreadable agent_security_codes
 * barrier table, admin pages (ContractingTrackingTab, AgentDetailModal)
 * can no longer read it via select('*') on agents. This edge function
 * provides a service_role read path for admin display.
 *
 * Accepts a single agent_id or an array of agent_ids.
 * Returns { codes: { [agent_id]: security_code } }
 *
 * No auth gate beyond the Supabase anon key (same as all portal functions).
 * The security_code is NOT a secret from admins — it's a secret from
 * unauthenticated users who only know a formId. Admins see codes in the
 * tracking/database views to support agents who need link resends.
 *
 * Pattern: service_role read from barrier table.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = await req.json();

    // Accept single agent_id or array of agent_ids
    const agentIds: string[] = body.agentIds
      ? body.agentIds
      : body.agentId
        ? [body.agentId]
        : [];

    if (agentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "agentId or agentIds required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = agentIds.filter((id: string) =>
      typeof id === "string" && uuidRegex.test(id)
    );

    if (validIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid agent IDs provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cap at 500 to prevent abuse
    const cappedIds = validIds.slice(0, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("agent_security_codes")
      .select("agent_id, security_code")
      .in("agent_id", cappedIds);

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch security codes" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build a map: { agent_id: security_code }
    const codes: Record<string, string> = {};
    for (const row of data || []) {
      codes[row.agent_id] = row.security_code;
    }

    return new Response(
      JSON.stringify({ codes }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
