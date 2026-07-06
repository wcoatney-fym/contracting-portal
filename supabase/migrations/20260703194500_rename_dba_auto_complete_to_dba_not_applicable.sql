/*
  # Add dba_not_applicable column to crm_agencies

  The DBA onboarding step needs an option for agencies that do not have (or do not
  want to submit) a DBA client roster. When flagged, onboarding can be completed by
  CRM Team approval WITHOUT a DBA upload present.

  1. Modified Tables
    - `crm_agencies`
      - Add `dba_not_applicable` (boolean, default false)

  2. Behavior
    - dba_not_applicable = false (default): normal flow -- agency uploads a DBA roster
      and the CRM Team confirms it to complete onboarding.
    - dba_not_applicable = true: the agency has no DBA. No upload is required; the CRM
      Team approves to complete onboarding without a DBA on file.

  3. Notes
    - All existing rows default to false, preserving current behavior.
    - Idempotent via IF NOT EXISTS guard.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_not_applicable'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN dba_not_applicable boolean NOT NULL DEFAULT false;
  END IF;
END $$;
