-- Paste-ready rollback for 20261104210000_fasttrack2_staff_scope_codes_hub_tokens.sql
-- Restores the exact pre-migration policy definitions (captured from pg_policies 2026-11-04).
DROP POLICY IF EXISTS authenticated_insert_codes ON public.agent_security_codes;
CREATE POLICY authenticated_insert_codes ON public.agent_security_codes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS authenticated_update_codes ON public.agent_security_codes;
CREATE POLICY authenticated_update_codes ON public.agent_security_codes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hub token: authenticated insert" ON public.agent_hub_tokens;
CREATE POLICY "hub token: authenticated insert" ON public.agent_hub_tokens
  FOR INSERT TO authenticated WITH CHECK (is_active = true);
