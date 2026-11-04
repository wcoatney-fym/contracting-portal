-- Rollback for 20261104220000_set_agent_security_code_rpc.sql
-- Drops the staff-only code-upsert RPC.
--
-- ⚠️ The FYM-App Intake re-send path calls this function once the paired
-- frontend PR is merged. Rolling this back without also reverting the
-- frontend to the direct upsert will break Intake form sends.

DROP FUNCTION IF EXISTS public.set_agent_security_code(uuid, text);
