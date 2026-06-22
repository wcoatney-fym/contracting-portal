/*
  # Add business details to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - `business_name` (text, nullable) - The agency's business display name
      - `business_logo_url` (text, nullable) - URL to the agency's logo image

  2. Notes
    - Both fields are required to complete onboarding step 2
    - These values are sent to a separate Zapier webhook for downstream processing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN business_name text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'business_logo_url'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN business_logo_url text DEFAULT NULL;
  END IF;
END $$;