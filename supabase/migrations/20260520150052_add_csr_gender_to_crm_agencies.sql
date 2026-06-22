/*
  # Add csr_gender column to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - `csr_gender` (text, nullable) - Stores the CSR's gender ('Male' or 'Female') for profile image mapping when CSR fills a terminated agent's seat

  2. Notes
    - This field is used to determine the correct profile image URL when the CSR auto-fills a roster seat
    - Without this field, the profile image column remains blank on the CRM Team Roster
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_gender'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_gender text;
  END IF;
END $$;
