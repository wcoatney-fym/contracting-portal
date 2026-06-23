ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS agency_npn text;
ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS agency_ein text;
ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS principal_agent text;
ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS principal_agent_npn text;
ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS contracting_email text;
ALTER TABLE crm_agencies ADD COLUMN IF NOT EXISTS contracting_contact text;