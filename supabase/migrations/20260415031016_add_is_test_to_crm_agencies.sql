/*
  # Add is_test flag to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - Added `is_test` (boolean, default false) to identify test accounts
  2. Data Changes
    - Sets `is_test = true` on the existing "Test" agency
  3. Notes
    - Test agencies will display undo/reset controls in the onboarding workflow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'is_test'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN is_test boolean DEFAULT false;
  END IF;
END $$;

UPDATE crm_agencies SET is_test = true WHERE name = 'Test';
