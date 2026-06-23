
-- Add crm_enabled flag to crm_agencies
-- Existing agencies (already in CRM workflow) get true; new agencies default false

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'crm_enabled'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN crm_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- All currently active agencies that have completed or are in CRM onboarding get crm_enabled = true
UPDATE crm_agencies SET crm_enabled = true WHERE is_active = true;
