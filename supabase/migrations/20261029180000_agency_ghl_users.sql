-- agency_ghl_users — GHL sub-account users per agency, captured by sync-ghl-data.
-- Purpose (Charlie, #dev-fym-app thread 1793285346, 2026-10-29): per-broker active
-- client tracking in CRM Ops FYM agency view. agency_clients.ghl_assigned_to holds
-- a GHL user id, but nothing mapped user id -> person (crm-ghl-sync discards the
-- created user id). This table is that map; brokers resolve by email match against
-- agents.form_type = 'hip-broker'.
--
-- Written by sync-ghl-data (service role) on every sync. Read by CRM Ops UI
-- (authenticated). No PII beyond name/email of CRM staff/agents.

CREATE TABLE IF NOT EXISTS agency_ghl_users (
  -- No FK: hierarchy_agencies is a barrier VIEW (base table _hierarchy_agencies, renamed 2026-09-03);
  -- a view can't be an FK target and coupling to the hidden base table isn't worth it here.
  agency_id uuid NOT NULL,
  ghl_user_id text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, ghl_user_id)
);

ALTER TABLE agency_ghl_users ENABLE ROW LEVEL SECURITY;

-- Default PostgREST GRANTs are implicit — revoke and grant explicitly (standing rule).
REVOKE ALL ON agency_ghl_users FROM anon, authenticated;
GRANT SELECT ON agency_ghl_users TO authenticated;

DROP POLICY IF EXISTS "authenticated_read_agency_ghl_users" ON agency_ghl_users;
CREATE POLICY "authenticated_read_agency_ghl_users"
  ON agency_ghl_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_write_agency_ghl_users" ON agency_ghl_users;
CREATE POLICY "service_role_write_agency_ghl_users"
  ON agency_ghl_users FOR ALL TO service_role USING (true) WITH CHECK (true);
