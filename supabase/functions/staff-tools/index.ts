/**
 * staff-tools — JWT-gated service-role writes for the portal STAFF pages
 * (tranche-1 rework, 2026-11-04).
 *
 * Replaces the last staff-page anon writes that tranche-1 revokes close:
 *   - AgentIntake:   anon INSERT into agent_security_codes (new form code)
 *   - AgentTracking: anon UPDATE on agent_security_codes (link resend)
 *   - RosterImport:  INSERT into agent_hub_tokens (bulk import auto-mint)
 *
 * Auth: a valid akhojh session JWT (same pattern as set-portal-password).
 * Codes are generated SERVER-SIDE with crypto randomness and returned to the
 * caller for the email body / alert — staff seeing codes is by design
 * (they support agents on link resends; see get-security-code).
 *
 *   POST { action: 'set_security_code', agent_id }                      → { code }
 *   POST { action: 'mint_hub_token', agent_id, npn?, first_name?, last_name? } → { token }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Crypto-random 6-digit code (client used Math.random). */
function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

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
    // 1. Require a real authenticated akhojh session (staff).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid or expired session" }, 401);
    // Staff only — POSITIVE check (Charlie review, 2026-11-04): require
    // kind === 'staff' explicitly. The previous deny-list (reject only
    // kind === 'agency') would have let any other authenticated akhojh user —
    // e.g. an account with no kind at all — set security codes or mint hub
    // tokens for any agent. akhojh has disable_signup=true (verified
    // 2026-11-04), so no-kind self-signups can't currently be created, but
    // the gate must not depend on that setting staying true.
    if (user.app_metadata?.kind !== "staff") return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action, 40);
    const agentId = clean(body.agent_id, 36);
    if (!UUID_RE.test(agentId)) return json({ error: "agent_id must be a valid UUID" }, 400);

    const { data: agent } = await supabase.from("agents").select("id").eq("id", agentId).maybeSingle();
    if (!agent) return json({ error: "Agent not found" }, 404);

    if (action === "set_security_code") {
      const code = generateCode();
      const { error: upErr } = await supabase
        .from("agent_security_codes")
        .upsert({ agent_id: agentId, security_code: code }, { onConflict: "agent_id" });
      if (upErr) {
        console.error("[staff-tools] set_security_code failed:", upErr.message);
        return json({ error: "Could not set the security code" }, 500);
      }
      return json({ code });
    }

    if (action === "mint_hub_token") {
      const { data: existing } = await supabase
        .from("agent_hub_tokens").select("token")
        .eq("agent_id", agentId).eq("is_active", true).maybeSingle();
      if (existing?.token) return json({ token: existing.token });

      const npn = clean(body.npn, 20).replace(/\D/g, "");
      const slug = buildAgentSlug(clean(body.first_name, 100), clean(body.last_name, 100), npn);
      const { data: minted, error: mintErr } = await supabase
        .from("agent_hub_tokens")
        .insert({ agent_id: agentId, npn: npn || null, agent_slug: slug || null })
        .select("token").maybeSingle();
      if (mintErr || !minted?.token) {
        console.error("[staff-tools] mint_hub_token failed:", mintErr?.message);
        return json({ error: "Could not create the hub token" }, 500);
      }
      return json({ token: minted.token });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[staff-tools]", err instanceof Error ? err.message : err);
    return json({ error: "Internal server error" }, 500);
  }
});
