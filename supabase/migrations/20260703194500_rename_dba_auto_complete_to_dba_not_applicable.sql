/*
  # Rework DBA toggle: dba_auto_complete -> dba_not_applicable

  The DBA onboarding step needs an option for agencies that do not have (or do not
  want to submit) a DBA client roster. When flagged, onboarding can be completed by
  CRM Team approval WITHOUT a DBA upload present.

  This renames the previously-added dba_auto_complete column to dba_not_applicable
  and repurposes its meaning:
    - dba_not_applicable = false (default): normal flow -- agency uploads a DBA roster
      and the CRM Team confirms it to complete onboarding.
    - dba_not_applicable = true: the agency has no DBA. No upload is required; the CRM
      Team approves to complete onboarding without a DBA on file.

  Non-destructive rename, reversible. All existing rows carry false, preserving
  current behavior.
*/

-- Made idempotent: prod never had dba_auto_complete created via migration, so a bare
-- RENAME fails (42703). Guard the rename and ensure the target column exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_auto_complete'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_not_applicable'
  ) THEN
    ALTER TABLE crm_agencies RENAME COLUMN dba_auto_complete TO dba_not_applicable;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_not_applicable'
  ) THEN
    ALTER TABLE crm_agencies
      ADD COLUMN dba_not_applicable boolean NOT NULL DEFAULT false;
  END IF;
END $$;
