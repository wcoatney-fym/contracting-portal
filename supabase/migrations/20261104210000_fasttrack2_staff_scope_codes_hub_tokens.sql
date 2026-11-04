-- FAST-TRACK #2 (Charlie, 2026-11-04 14:10 CT — pre-approved, applied same day).
-- The surviving authenticated write policies had no scope: any kind='agency'
-- portal-auth session (downline agency admins/managers) could overwrite any
-- agent's security code (-> contracting-form takeover chain) or mint an active
-- hub token for any agent. Nothing legitimate writes these outside staff:
-- downline Contracting = AgencyActivationView only; FYM-App ContractingIntakeTab's
-- code upsert runs under a staff session.
-- Rollback: supabase/rollbacks/20261104210000_rollback.sql (committed before apply).

DROP POLICY IF EXISTS authenticated_insert_codes ON public.agent_security_codes;
CREATE POLICY authenticated_insert_codes ON public.agent_security_codes
  FOR INSERT TO authenticated WITH CHECK (public.portal_is_staff());

DROP POLICY IF EXISTS authenticated_update_codes ON public.agent_security_codes;
CREATE POLICY authenticated_update_codes ON public.agent_security_codes
  FOR UPDATE TO authenticated USING (public.portal_is_staff()) WITH CHECK (public.portal_is_staff());

DROP POLICY IF EXISTS "hub token: authenticated insert" ON public.agent_hub_tokens;
CREATE POLICY "hub token: authenticated insert" ON public.agent_hub_tokens
  FOR INSERT TO authenticated WITH CHECK (public.portal_is_staff() AND is_active = true);
