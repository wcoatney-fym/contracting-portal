/*
  # Add CRM number to agencies

  1. Modified Tables
    - `crm_agencies`
      - `crm_number` (text, nullable) - The CRM phone number assigned to the agency
  
  2. Notes
    - This number gets auto-filled into all 200 roster rows for the agency
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'crm_number'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN crm_number text;
  END IF;
END $$;