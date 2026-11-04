-- set_agent_security_code RPC — staff-only code upsert, table stays SELECT-dark
--
-- Context: fast-track 2 (20261104210000) scoped the authenticated write policies on
-- agent_security_codes to portal_is_staff(). That left the Intake re-send upsert
-- broken for portal staff sessions, because Postgres requires rows referenced by
-- ON CONFLICT / UPDATE ... WHERE to also pass SELECT policies, and the table keeps
-- a blanket authenticated_select_deny (false). Decision (Charlie, 2026-11-04):
-- do NOT open SELECT. Route the upsert through a SECURITY DEFINER RPC instead,
-- so the table remains fully unreadable to every portal session.
--
-- The function:
--   * raises 42501 unless portal_is_staff()
--   * validates the code is exactly 6 digits
--   * performs INSERT ... ON CONFLICT (agent_id) DO UPDATE internally
--     (definer = table owner, so RLS/SELECT-deny does not apply inside)
--   * EXECUTE revoked from public/anon, granted to authenticated only
--     (the staff check lives inside the function body)
--
-- Rollback: supabase/rollbacks/20261104220000_rollback.sql (drops the function;
-- frontend must be reverted to the direct upsert in the same window or Intake
-- sends will fail).

CREATE OR REPLACE FUNCTION public.set_agent_security_code(p_agent_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.portal_is_staff() THEN
    RAISE EXCEPTION 'permission denied: staff only'
      USING ERRCODE = '42501';
  END IF;

  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid security code: must be exactly 6 digits'
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  INSERT INTO public.agent_security_codes (agent_id, security_code, updated_at)
  VALUES (p_agent_id, p_code, now())
  ON CONFLICT (agent_id)
  DO UPDATE SET security_code = EXCLUDED.security_code,
                updated_at   = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_agent_security_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_agent_security_code(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_agent_security_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_agent_security_code(uuid, text) TO service_role;
