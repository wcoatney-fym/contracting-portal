/**
 * staff-login — per-person staff sessions for the Contracting Portal
 * (containment PR, 2026-11-04; hardened 2026-11-04).
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
 * Hardening (2026-11-04, Charlie review):
 * - Allowlist (staff_allowlist table): matching the shared domain password
 *   alone used to be enough to mint a kind='staff' session for ANY address
 *   on the domain, including made-up ones. Now the email must ALSO be an
 *   active row in staff_allowlist — checked before any user lookup/create,
 *   so an unlisted email is rejected even with the correct password.
 * - Rate limiting (staff_login_attempts table): every attempt (success or
 *   failure) is logged with email + source IP. 5 failed attempts for the
 *   same email OR same IP within the lockout window locks out further
 *   attempts for 15 minutes, DB-backed so it holds across serverless
 *   invocations (no in-memory state).
 *
 * TICKET for later (not building now): replace the shared domain password
 * entirely with per-person passwords or emailed magic links. The allowlist +
 * rate limit here reduce the blast radius of the shared-secret design but
 * don't remove the underlying risk of one shared credential across all staff.
 *
 *   POST { email, password } → { access_token, refresh_token, expires_at }
 *
 * Deploy with --no-verify-jwt (it IS the login).
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

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

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

function clientIp(req: Request): string | null {
  // Standard proxy header chain; take the first (client) hop.
  // TICKET (Charlie review, 2026-11-04, non-blocking): the first x-forwarded-for
  // hop is caller-controlled, so the per-IP lockout is spoofable — the per-email
  // lockout is the real protection. Switch to the gateway-appended hop (last
  // trusted entry) in a follow-up.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/**
 * DB-backed lockout check: 5 failed attempts for this email OR this IP
 * within the lockout window blocks further attempts, regardless of whether
 * the password given this time is correct. Stateless-friendly (no
 * in-memory counters) so it holds across serverless cold starts.
 */
async function isLockedOut(
  admin: SupabaseClient,
  email: string,
  ip: string | null,
): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: emailCount } = await admin
    .from("staff_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("success", false)
    .gte("created_at", since);
  if ((emailCount ?? 0) >= MAX_FAILED_ATTEMPTS) return true;

  if (ip) {
    const { count: ipCount } = await admin
      .from("staff_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    if ((ipCount ?? 0) >= MAX_FAILED_ATTEMPTS) return true;
  }
  return false;
}

async function logAttempt(
  admin: SupabaseClient,
  email: string,
  ip: string | null,
  success: boolean,
): Promise<void> {
  const { error } = await admin.from("staff_login_attempts").insert({ email, ip, success });
  if (error) console.error("[staff-login] failed to log attempt:", error.message);
  // Best-effort retention: prune attempts older than 24h so the table doesn't
  // grow unbounded. Not critical-path — failures here are swallowed.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  admin.from("staff_login_attempts").delete().lt("created_at", cutoff).then(
    ({ error: delErr }) => { if (delErr) console.error("[staff-login] prune failed:", delErr.message); },
  );
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
    const ip = clientIp(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 0. Rate limit / lockout check — before touching credentials at all.
    //    5 failed attempts for this email OR this IP within 15 minutes
    //    blocks further attempts regardless of what password is supplied.
    if (await isLockedOut(admin, email, ip)) {
      return json({ error: "Too many failed attempts. Try again in a few minutes." }, 429);
    }

    // 1. Allowlist check — explicit allow-list, not a deny-list. The shared
    //    domain password alone is NOT sufficient; the email must also be an
    //    active row in staff_allowlist. Checked before any credential work so
    //    an unlisted email is rejected the same way whether or not the
    //    password happens to be correct (no information leak either way).
    const { data: allowed } = await admin
      .from("staff_allowlist")
      .select("email")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle();
    if (!allowed) {
      await logAttempt(admin, email, ip, false);
      return json({ error: "Invalid credentials" }, 401);
    }

    // 2. Same credential validate-portal-login checks: the domain's shared
    //    portal password (portal_credentials, SHA-256).
    const { data: credential } = await admin
      .from("portal_credentials")
      .select("password_hash")
      .eq("email_domain", domain)
      .eq("is_active", true)
      .maybeSingle();
    if (!credential || (await hashPassword(password)) !== credential.password_hash) {
      await logAttempt(admin, email, ip, false);
      return json({ error: "Invalid credentials" }, 401);
    }

    // 3. Find or create THIS staff member's own auth user (kind 'staff').
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

    // 4. Mint the session without a password: server-side magic-link exchange
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

    // Success — log it (resets nothing for other identities, but gives a
    // clean audit trail of who logged in from where).
    await logAttempt(admin, email, ip, true);

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
