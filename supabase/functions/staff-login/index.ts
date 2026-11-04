/**
 * staff-login — per-person staff sessions for the Contracting Portal
 * (containment PR, 2026-11-04).
 *
 * Replaces the AuthContext VITE_SERVICE_EMAIL / VITE_SERVICE_PASSWORD path,
 * which signed EVERY staff member in as the shared service@teamfym.com
 * account — the same account FYM-App edge functions use ~1,100×/day via the
 * PORTAL_SERVICE_* secrets. With this function live, the service account's
 * password can be rotated without touching any frontend.
 *
 * Gate UX is unchanged: staff enter their own @teamfym.com email + the shared
 * portal password (portal_credentials by email domain, SHA-256 — exactly what
 * validate-portal-login checks). On success the function finds-or-creates an
 * akhojh auth user for THAT email (app_metadata.kind = 'staff', confirmed, no
 * password stored) and mints a session server-side with the magic-link
 * exchange portal-auth uses for agency users. Each staff member gets their
 * own session → per-person audit trail, no shared credential in any bundle.
 *
 *   POST { email, password } → { access_token, refresh_token, expires_at }
 *
 * Deploy with --no-verify-jwt (it IS the login).
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

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return json({ error: "Email and password required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email format" }, 400);

    const domain = email.split("@")[1];
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 1. Same credential validate-portal-login checks: the domain's shared
    //    portal password (portal_credentials, SHA-256).
    const { data: credential } = await admin
      .from("portal_credentials")
      .select("password_hash")
      .eq("email_domain", domain)
      .eq("is_active", true)
      .maybeSingle();
    if (!credential || (await hashPassword(password)) !== credential.password_hash) {
      return json({ error: "Invalid credentials" }, 401);
    }

    // 2. Find or create THIS staff member's own auth user (kind 'staff').
    //    Never touch the shared service account here.
    let userId: string | null = null;
    const { data: page, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      console.error("[staff-login] listUsers failed:", listErr.message);
      return json({ error: "Could not sign in" }, 500);
    }
    const existing = page.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (existing) {
      userId = existing.id;
      if (existing.app_metadata?.kind !== "staff") {
        // Agency portal users can never piggyback onto a staff session.
        if (existing.app_metadata?.kind === "agency") return json({ error: "Invalid credentials" }, 401);
        const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { ...existing.app_metadata, kind: "staff" },
        });
        if (updErr) {
          console.error("[staff-login] claim update failed:", updErr.message);
          return json({ error: "Could not sign in" }, 500);
        }
      }
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { kind: "staff" },
      });
      if (createErr || !created.user) {
        console.error("[staff-login] createUser failed:", createErr?.message);
        return json({ error: "Could not sign in" }, 500);
      }
      userId = created.user.id;
    }

    // 3. Mint the session without a password: server-side magic-link exchange
    //    (same pattern as FYM-App portal-auth agency sessions).
    const { data: gen, error: genErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = gen?.properties?.hashed_token;
    if (genErr || !tokenHash) {
      console.error("[staff-login] generateLink failed:", genErr?.message);
      return json({ error: "Could not sign in" }, 500);
    }
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (verifyErr || !verified.session) {
      console.error("[staff-login] verifyOtp failed:", verifyErr?.message);
      return json({ error: "Could not sign in" }, 500);
    }

    return json({
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      expires_at: verified.session.expires_at,
    });
  } catch (err) {
    console.error("[staff-login]", err instanceof Error ? err.message : err);
    return json({ error: "Internal server error" }, 500);
  }
});
