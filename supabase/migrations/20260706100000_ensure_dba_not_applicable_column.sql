/*
  # Ensure crm_agencies.dba_not_applicable exists (prod hotfix)

  Bug: The "I don't have a DBA client roster" opt-out silently did nothing in
  production. Root cause: the dba_not_applicable column was never created in the
  prod database. The rename migration (20260703194500) assumed a pre-existing
  dba_auto_complete column that only existed in Bolt/dev, so it never applied to
  prod. The frontend UPDATE to dba_not_applicable failed with 42703 and the error
  was swallowed, leaving the agency and CRM views unchanged.

  This migration idempotently guarantees the column exists so the No-DBA flow works:
  agency opts out -> CRM toggle reflects it -> CRM approves -> onboarding_complete.

  Non-destructive, reversible, safe to run on any environment.
*/

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
