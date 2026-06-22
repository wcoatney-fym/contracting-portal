/*
  # Add Subaccount Setup Columns

  1. Modified Tables
    - `crm_agencies`
      - `setup_subaccount` (boolean, default false) - tracks whether subaccount has been set up
      - `setup_snapshot` (boolean, default false) - tracks whether snapshot has been pushed
      - `setup_ghl_api` (boolean, default false) - tracks whether GHL API has been added
      - `setup_zapier` (boolean, default false) - tracks whether Zapier has been wired up

  2. Notes
    - These columns support the new internal "Subaccount Setup" onboarding step
    - CRM team must complete all 4 checkboxes before roster upload is unlocked
    - New onboarding_status value 'awaiting_subaccount_setup' sits between 'awaiting_agency_phone' and 'awaiting_roster_upload'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'setup_subaccount'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN setup_subaccount boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'setup_snapshot'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN setup_snapshot boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'setup_ghl_api'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN setup_ghl_api boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'setup_zapier'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN setup_zapier boolean DEFAULT false;
  END IF;
END $$;
