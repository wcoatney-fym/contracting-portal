/**
 * contracting-form — security-code-gated writes for the PUBLIC intake forms
 * (tranche-1 rework, 2026-11-04). Mirrors the FYM-App function of the same
 * name: the form link + the 6-digit security code is the credential, verified
 * server-side, and every write is pinned to that one agent.
 *
 * Today: hub-token MINTING only. The forms (LifeOnly/HIP/Telesales/Field/
 * DirectPay) minted agent_hub_tokens with the anon key client-side — which
 * required an open anon INSERT policy that let any visitor mint an active
 * token for ANY agent_id (impersonation). After tranche-1 revokes, this is
 * the only mint path on the intake flow.
 *
 *   POST { form_id, security_code, action: 'mint_hub_token', npn?, first_name?, last_name? }
 *     → { token, agent_slug }
 *
 * Deploy with --no-verify-jwt: nobody is signed in on the forms.
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
    const formId = clean(body.form_id, 36);
    const code = clean(body.security_code, 12).replace(/\D/g, "");
    const action = clean(body.action, 32);
    if (!UUID_RE.test(formId) || code.length !== 6) {
      return json({ error: "Invalid form link or security code" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Same proof verify-security-code asks for before the form opens.
    const { data: codeRow } = await supabase
      .from("agent_security_codes").select("security_code").eq("agent_id", formId).maybeSingle();
    if (!codeRow || String(codeRow.security_code) !== code) {
      return json({ error: "Invalid security code" }, 401);
    }

    if (action === "mint_hub_token") {
      const { data: existing } = await supabase
        .from("agent_hub_tokens").select("token, agent_slug")
        .eq("agent_id", formId).eq("is_active", true).maybeSingle();
      if (existing?.token) return json({ token: existing.token, agent_slug: existing.agent_slug });

      const npn = clean(body.npn, 20).replace(/\D/g, "");
      const slug = buildAgentSlug(clean(body.first_name, 100), clean(body.last_name, 100), npn);
      const { data: minted, error: mintErr } = await supabase
        .from("agent_hub_tokens")
        .insert({ agent_id: formId, npn: npn || null, agent_slug: slug || null })
        .select("token, agent_slug").maybeSingle();
      if (mintErr || !minted?.token) {
        console.error("[contracting-form] mint failed:", mintErr?.message);
        return json({ error: "Could not create the hub token" }, 500);
      }
      return json({ token: minted.token, agent_slug: minted.agent_slug });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[contracting-form]", err instanceof Error ? err.message : err);
    return json({ error: "Internal server error" }, 500);
  }
});
