/*
  # Add gender column to form_submissions

  1. Modified Tables
    - `form_submissions`
      - Added `gender` (text, nullable) - stores Male or Female selection from intake forms

  2. Notes
    - Column is nullable to preserve existing rows
    - Values will be 'Male' or 'Female' as selected via radio button on intake forms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_submissions' AND column_name = 'gender'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN gender text;
  END IF;
END $$;