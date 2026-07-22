-- V2: Expand crm_business_intake to match the full Google Form column set
-- Adds: all original form fields, edit tracking, management-only columns

-- ========== New agent/sales context columns ==========
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS medicare_id text,
  ADD COLUMN IF NOT EXISTS upline text,
  ADD COLUMN IF NOT EXISTS call_type text,
  ADD COLUMN IF NOT EXISTS transfer_agent text,
  ADD COLUMN IF NOT EXISTS sales_agent text,
  ADD COLUMN IF NOT EXISTS original_aor text,
  ADD COLUMN IF NOT EXISTS submit_date date;

-- ========== Expand client columns (rename existing + add new) ==========
-- full_name replaces client_first_name + client_last_name for the Google Form pattern
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS zip_code text;

-- client_state already exists; client_phone and client_email already exist

-- ========== Expand policy columns ==========
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS plan_policy_type text,
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS plan_change_status text,
  ADD COLUMN IF NOT EXISTS advancement text,
  ADD COLUMN IF NOT EXISTS election_period text;

-- carrier already exists; effective_date already exists
-- Rename product_type → carrier_name is NOT safe (existing data), keep both
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS carrier_name text;

-- ========== Additional contact / context columns ==========
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS hra boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_address text,
  ADD COLUMN IF NOT EXISTS sunfire_personal_code text,
  ADD COLUMN IF NOT EXISTS doctors text,
  ADD COLUMN IF NOT EXISTS medications text,
  ADD COLUMN IF NOT EXISTS notes_selling_points text;

-- ========== Edit tracking ==========
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- ========== Management-only columns ==========
ALTER TABLE crm_business_intake
  ADD COLUMN IF NOT EXISTS needs_fix boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS corrected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mgmt_details text,
  ADD COLUMN IF NOT EXISTS mgmt_notes text;

-- ========== Relax NOT NULL on columns the new form doesn't always use ==========
-- The v1 schema required client_first_name, client_last_name, carrier, product_type
-- V2 uses full_name instead; carrier_name replaces carrier for new submissions
-- Keep the old columns for backward compat but allow NULL
ALTER TABLE crm_business_intake
  ALTER COLUMN client_first_name DROP NOT NULL,
  ALTER COLUMN client_last_name DROP NOT NULL,
  ALTER COLUMN carrier DROP NOT NULL,
  ALTER COLUMN product_type DROP NOT NULL,
  ALTER COLUMN agent_first_name DROP NOT NULL,
  ALTER COLUMN agent_last_name DROP NOT NULL,
  ALTER COLUMN agent_npn DROP NOT NULL,
  ALTER COLUMN agency_name DROP NOT NULL;

-- ========== Update status CHECK to include new workflow states ==========
ALTER TABLE crm_business_intake DROP CONSTRAINT IF EXISTS crm_business_intake_status_check;
ALTER TABLE crm_business_intake
  ADD CONSTRAINT crm_business_intake_status_check
  CHECK (status IN ('submitted', 'under_review', 'needs_fix', 'corrected', 'approved', 'pending', 'rejected', 'cancelled'));

-- ========== Indexes for new query patterns ==========
CREATE INDEX IF NOT EXISTS idx_crm_business_intake_needs_fix ON crm_business_intake(needs_fix) WHERE needs_fix = true;
CREATE INDEX IF NOT EXISTS idx_crm_business_intake_is_edited ON crm_business_intake(is_edited) WHERE is_edited = true;
CREATE INDEX IF NOT EXISTS idx_crm_business_intake_medicare_id ON crm_business_intake(medicare_id);

-- ========== Update the agency_clients trigger to map new fields ==========
CREATE OR REPLACE FUNCTION fn_intake_to_agency_client()
RETURNS trigger AS $$
BEGIN
  INSERT INTO agency_clients (
    agency_id,
    client_name,
    phone,
    email,
    state,
    ghl_assigned_to,
    status,
    source,
    created_at,
    updated_at
  ) VALUES (
    NEW.agency_id,
    COALESCE(NEW.full_name, TRIM(COALESCE(NEW.client_first_name, '') || ' ' || COALESCE(NEW.client_last_name, ''))),
    COALESCE(NEW.client_phone, NEW.phone),
    COALESCE(NEW.email_address, NEW.client_email),
    NEW.client_state,
    TRIM(COALESCE(NEW.agent_first_name, '') || ' ' || COALESCE(NEW.agent_last_name, '')),
    'active',
    'intake_form',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN crm_business_intake.carrier IS 'V1 carrier field (UNL/GTL). Kept for backward compat. V2 uses carrier_name.';
COMMENT ON COLUMN crm_business_intake.product_type IS 'V1 product type. Kept for backward compat.';
COMMENT ON COLUMN crm_business_intake.carrier_name IS 'V2 carrier name from Google Form column set.';
