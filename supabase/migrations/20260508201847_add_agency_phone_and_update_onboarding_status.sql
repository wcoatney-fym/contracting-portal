/*
  # Add agency phone column and expand onboarding_status

  1. Modified Tables
    - `crm_agencies`
      - `agency_phone` (text, nullable) - The agency's main phone number, set during onboarding by CRM team
      - Updated `onboarding_status` CHECK constraint to include 'awaiting_agency_phone' between CSR and roster steps

  2. Notes
    - New 4-step onboarding flow: CSR -> Agency Phone -> Roster -> DBA
    - The agency phone step is CRM-team-only (not visible to agency portal)
    - CRM # is also set during this step and propagated to roster rows on confirmation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'agency_phone'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN agency_phone text;
  END IF;
END $$;

ALTER TABLE crm_agencies DROP CONSTRAINT IF EXISTS crm_agencies_onboarding_status_check;

ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_onboarding_status_check
  CHECK (onboarding_status IN ('pending_csr_assignment', 'awaiting_agency_phone', 'awaiting_roster_upload', 'awaiting_dba_upload', 'onboarding_complete'));