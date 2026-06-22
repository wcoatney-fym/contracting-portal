/*
  # Add CSR Detail Fields to Agencies

  1. Modified Tables
    - `crm_agencies`
      - Added `csr_first_name` (text, nullable) - CSR first name
      - Added `csr_last_name` (text, nullable) - CSR last name
      - Added `csr_phone` (text, nullable) - CSR phone number
      - Added `csr_email` (text, nullable) - CSR email address
      - Added `csr_npn` (text, nullable) - CSR NPN number (optional)

  2. Notes
    - These fields replace the single `assigned_csr` display name
    - `assigned_csr` is kept for backwards compatibility and will be computed from first + last name
    - All fields are nullable since they are filled during onboarding step 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_first_name'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_last_name'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_phone'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_email'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_npn'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_npn text;
  END IF;
END $$;
