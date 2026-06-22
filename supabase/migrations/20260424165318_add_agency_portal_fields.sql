/*
  # Add Agency Portal Fields

  1. Modified Tables
    - `crm_agencies`
      - `slug` (text, unique, nullable) - URL slug for agency portal routing (e.g., "test" for /test)
      - `portal_password` (text, nullable) - Password for agency portal access, defaults to [AgencyName]CRMPortal!

  2. Data Updates
    - Populate existing "Test" agency with slug "test" and portal_password "TestCRMPortal!"

  3. Important Notes
    - slug is nullable to preserve existing agencies (FYM, Wisechoice, Aspire) that don't need portal pages
    - portal_password stored as plain text since these are low-security shared team passwords
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'slug'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN slug text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'portal_password'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN portal_password text;
  END IF;
END $$;

UPDATE crm_agencies
SET slug = 'test', portal_password = 'TestCRMPortal!'
WHERE name = 'Test' AND slug IS NULL;
