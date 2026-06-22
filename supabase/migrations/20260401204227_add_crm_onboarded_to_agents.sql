/*
  # Add CRM Onboarded Flag to Agents

  1. Modified Tables
    - `agents`
      - `crm_onboarded` (boolean, default false) - Tracks whether an agent has been submitted for CRM onboarding

  2. Important Notes
    - Non-destructive change: adds a new column with a default value
    - All existing agents will default to not onboarded (false)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'crm_onboarded'
  ) THEN
    ALTER TABLE agents ADD COLUMN crm_onboarded boolean NOT NULL DEFAULT false;
  END IF;
END $$;
