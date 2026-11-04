-- FAST-TRACK security fix (Charlie, 2026-11-04 13:54 CT — pre-approved, applied same day).
-- Closes the anon takeover chain: with the public key, anyone could overwrite any
-- agent's security code (anon_update_codes qual=true), then pass contracting-form's
-- code check and run update_contact / complete / mint_hub_token on any record.
-- pg_stat_statements: anon ran exactly 1 UPDATE + 1 SELECT on agent_security_codes all year.
-- Rollback: supabase/rollbacks/20261104200000_rollback.sql (committed before apply).

-- agent_security_codes: kill anon writes. anon_select_deny (qual=false) left in place — moot after REVOKE.
DROP POLICY IF EXISTS anon_update_codes ON public.agent_security_codes;
DROP POLICY IF EXISTS anon_insert_codes ON public.agent_security_codes;
REVOKE ALL ON public.agent_security_codes FROM anon;

-- agent_hub_tokens: legacy client-side mint path only. FYM-App mints via contracting-form
-- (service role, bypasses RLS); hub has zero logins ever.
-- NOTE: hub_token_read_by_token was role {public} — dropping it also removes the
-- authenticated read path. No authenticated reader exists in FYM-App (service-role only).
DROP POLICY IF EXISTS anon_insert_hub_token ON public.agent_hub_tokens;
DROP POLICY IF EXISTS hub_token_read_by_token ON public.agent_hub_tokens;
REVOKE ALL ON public.agent_hub_tokens FROM anon;
