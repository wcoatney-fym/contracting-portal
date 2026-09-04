/*
  # agent_security_codes barrier table — isolate security codes from anon reads

  Context:
  - security_code lived in the agents table, which anon can SELECT (40+ portal reads)
  - Anyone with a formId (UUID in the intake URL) could read the security code
    via /rest/v1/agents?id=eq.{formId}&select=security_code
  - The security code protects SSN intake form access — this was a live access-control bypass

  Fix:
  - Move security_code to a separate table that anon CANNOT SELECT
  - verify-security-code edge function validates against this table via service_role
  - get-security-code edge function provides admin display via service_role
  - Same barrier pattern as agent_intake_safe (SSNs) and portal_credentials (passwords)

  Grants:
  - anon: INSERT + UPDATE only (frontends create/resend codes as anon)
  - anon: SELECT granted but blocked by RLS policy (needed for PostgREST PATCH)
  - No SELECT data returned to anon (RLS USING(false) on SELECT policy)
  - service_role: full access (bypasses RLS)

  Migration already applied to live DB via Management API.
*/

-- Create the barrier table
CREATE TABLE IF NOT EXISTS public.agent_security_codes (
  agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  security_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill from agents.security_code (idempotent)
INSERT INTO public.agent_security_codes (agent_id, security_code, created_at, updated_at)
SELECT id, security_code, COALESCE(created_at, now()), COALESCE(updated_at, now())
FROM public.agents
WHERE security_code IS NOT NULL
ON CONFLICT (agent_id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.agent_security_codes ENABLE ROW LEVEL SECURITY;

-- REVOKE default grants, then grant only what's needed
REVOKE ALL ON public.agent_security_codes FROM anon;
REVOKE ALL ON public.agent_security_codes FROM authenticated;

-- anon needs INSERT (new agent creation) and UPDATE (resend-link)
GRANT INSERT, UPDATE, SELECT ON public.agent_security_codes TO anon;

-- RLS: anon can INSERT and UPDATE, but SELECT returns zero rows
CREATE POLICY "anon_select_deny" ON public.agent_security_codes
  FOR SELECT TO anon USING (false);

CREATE POLICY "anon_insert_codes" ON public.agent_security_codes
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_codes" ON public.agent_security_codes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_agent_security_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_security_codes_updated_at
  BEFORE UPDATE ON public.agent_security_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_security_codes_updated_at();
