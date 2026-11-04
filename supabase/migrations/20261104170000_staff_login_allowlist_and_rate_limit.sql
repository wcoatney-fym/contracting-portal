/*
  # staff-login hardening: explicit allowlist + rate limiting

  Context:
  - staff-login (containment PR, 2026-11-04) lets ANY email matching an active
    portal_credentials domain (e.g. "@teamfym.com") + the shared domain
    password auto-create-or-claim a kind='staff' auth user. That grants access
    to agent_intake (SSN/DOB) and agency_clients. There was no check that the
    email belongs to an actual staff member — a made-up address like
    randomname@teamfym.com with the correct shared password got staff access.
  - No rate limiting existed on failed attempts, and the shared password is
    unsalted SHA-256 — brute-forceable with no cooldown.

  Fix (this migration, DB side):
  1. staff_allowlist — explicit allow-list of staff emails. Chosen over a
     function secret because the existing pattern in this repo for small,
     occasionally-updated access-control lists is a barrier table
     (portal_credentials, agent_security_codes), not env/secret config —
     keeping it in the DB means adding/removing a staff member doesn't
     require a function redeploy, and it's auditable (created_at, who/when
     via Supabase dashboard history) the same way portal_credentials is.
  2. staff_login_attempts — per-email + per-IP failed-attempt counter with a
     lockout window, enforced in the edge function. DB-backed (not
     in-memory) so it works correctly across serverless invocations.

  Both tables: RLS enabled, no anon/authenticated grants at all — service
  role only, same barrier pattern as agent_security_codes.
*/

-- 1. Explicit staff allowlist ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.staff_allowlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.staff_allowlist FROM anon;
REVOKE ALL ON public.staff_allowlist FROM authenticated;
-- No GRANTs to anon/authenticated at all — service_role bypasses RLS and is
-- the only caller (staff-login function, manual dashboard edits by Charlie).

-- Seed: carry forward the known staff users already created under the old
-- Final seed confirmed by Charlie 2026-11-04 (#dev-fym-app). Evidence check
-- before committing: akhojh auth.users has ZERO human kind='staff' accounts
-- (only service@ + crm-automation@, both machine accounts) — the old
-- auto-create path was never used by a real person, so nobody is silently
-- locked out by starting narrow. Adding a staffer later is one INSERT into
-- staff_allowlist (no deploy needed); under-provisioning is cheap,
-- over-provisioning is an access grant — so this list stays explicit.
INSERT INTO public.staff_allowlist (email, note) VALUES
  ('rmitchell@teamfym.com', 'seed: confirmed by Charlie 2026-11-04'),
  ('will@teamfym.com', 'seed: confirmed by Charlie 2026-11-04')
ON CONFLICT (email) DO NOTHING;

-- 2. Failed-attempt tracking for rate limiting -------------------------------
CREATE TABLE IF NOT EXISTS public.staff_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_login_attempts_email_time_idx
  ON public.staff_login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_login_attempts_ip_time_idx
  ON public.staff_login_attempts (ip, created_at DESC);

ALTER TABLE public.staff_login_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.staff_login_attempts FROM anon;
REVOKE ALL ON public.staff_login_attempts FROM authenticated;
-- service_role only — the edge function logs attempts and checks the
-- lockout window via the service-role client it already holds.

-- Light retention: attempts older than 24h are noise once the lockout window
-- (15 min) has long since expired. Pruned opportunistically by the function
-- (best-effort DELETE on each invocation) rather than a separate cron, to
-- avoid adding a new scheduled job for a low-volume table.

-- 3. Staff-session read/write policies for pages staff use today ---------------
-- (Charlie review round 2, 2026-11-04.) Once staff hold real authenticated
-- sessions instead of riding anon, three tables staff pages touch only had
-- anon policies and would go blank / fail:
--   agent_hub_logins       SELECT  (BiancaHub recent-logins panel)
--   agent_live_attendance  SELECT  (BiancaHub attendance panel)
--   webhook_log            INSERT  (submitSafety client-error logging)
-- Add matching policies for authenticated callers gated on portal_is_staff()
-- (= portal_kind() = 'staff', reads app_metadata.kind from the JWT; both
-- functions already live in akhojh). webhook_log keeps the exact same check
-- as the anon insert policy (client:% error rows only).

CREATE POLICY staff_select_agent_hub_logins ON public.agent_hub_logins
  FOR SELECT TO authenticated
  USING (public.portal_is_staff());

CREATE POLICY staff_select_agent_live_attendance ON public.agent_live_attendance
  FOR SELECT TO authenticated
  USING (public.portal_is_staff());

CREATE POLICY staff_insert_client_errors ON public.webhook_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.portal_is_staff()
    AND function_name LIKE 'client:%'
    AND outcome = 'error'
  );
