-- Paste-ready rollback for 20261104200000_fasttrack_revoke_anon_codes_hub_tokens.sql
-- Restores the exact pre-migration grants + policy definitions (captured from
-- pg_policies / role_table_grants on 2026-11-04 before apply).
GRANT SELECT, INSERT, UPDATE ON public.agent_security_codes TO anon;
CREATE POLICY anon_insert_codes ON public.agent_security_codes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY anon_update_codes ON public.agent_security_codes FOR UPDATE TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.agent_hub_tokens TO anon;
CREATE POLICY anon_insert_hub_token ON public.agent_hub_tokens FOR INSERT TO anon WITH CHECK (is_active = true);
CREATE POLICY hub_token_read_by_token ON public.agent_hub_tokens FOR SELECT USING (is_active = true);
