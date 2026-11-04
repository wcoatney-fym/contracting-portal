/**
 * hub-login — server-side Agent Hub sign-in (tranche-1 rework, 2026-11-04).
 *
 * Replaces HubLogin.tsx's anon-key queries against agents / agent_intake /
 * agent_hub_tokens. Those required anon SELECT on agent_hub_tokens (any
 * visitor could enumerate every active token → impersonate any hub) and anon
 * INSERT (mint arbitrary active tokens). After tranche-1 revokes land, this
 * function is the only way to exchange name + NPN for a hub token.
 *
 *   POST { first_name, last_name, npn }  →  { token }  |  404 (generic)
 *
 * Credential model is unchanged from the current product: first/last name +
 * NPN. The lookup and the mint simply happen with the service role, server
 * side, returning ONLY the matched agent's own token.
 *
 * Deploy with --no-verify-jwt: hub agents have no auth session.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function buildAgentSlug(firstName: string, lastName: string, npn: string): string {
  return [firstName, lastName, npn]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .join("-");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const firstName = clean(body.first_name, 100);
    const lastName = clean(body.last_name, 100);
    const npn = clean(body.npn, 20).replace(/\D/g, "");
    if (!firstName || !lastName || !npn) return json({ error: "All fields are required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 1. Match the agent: agents by name + canonical NPN, fallback agent_intake
    //    NPN with a name check — same resolution HubLogin.tsx did client-side.
    const { data: agent } = await supabase
      .from("agents").select("id")
      .ilike("first_name", firstName).ilike("last_name", lastName).eq("npn", npn)
      .maybeSingle();
    let agentId: string | null = agent?.id ?? null;

    if (!agentId) {
      const { data: intake } = await supabase
        .from("agent_intake").select("agent_id").eq("npn", npn).maybeSingle();
      if (intake?.agent_id) {
        const { data: agentCheck } = await supabase
          .from("agents").select("id").eq("id", intake.agent_id)
          .ilike("first_name", firstName).ilike("last_name", lastName)
          .maybeSingle();
        if (agentCheck) agentId = agentCheck.id;
      }
    }

    if (!agentId) return json({ error: "not_found" }, 404); // generic — no enumeration hints

    // 2. Find or create the agent's active hub token.
    const { data: existing } = await supabase
      .from("agent_hub_tokens").select("token")
      .eq("agent_id", agentId).eq("is_active", true).maybeSingle();

    let token = existing?.token ?? null;
    if (!token) {
      const { data: minted, error: mintErr } = await supabase
        .from("agent_hub_tokens")
        .insert({ agent_id: agentId, npn, agent_slug: buildAgentSlug(firstName, lastName, npn) || null })
        .select("token").maybeSingle();
      if (mintErr || !minted?.token) {
        console.error("[hub-login] mint failed:", mintErr?.message);
        return json({ error: "Could not create the hub session" }, 500);
      }
      token = minted.token;
    }

    await supabase.from("agent_hub_logins").insert({ agent_id: agentId, login_method: "npn" });

    return json({ token });
  } catch (err) {
    console.error("[hub-login]", err instanceof Error ? err.message : err);
    return json({ error: "Internal server error" }, 500);
  }
});
