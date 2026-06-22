/*
  # Add date_created field to crm_agencies

  1. Changes
    - Add `date_created` (date, nullable) to `crm_agencies`
      - This is a backdatable field representing when the agency account was actually created
      - Distinct from `created_at` which is the row insertion timestamp
    - Backfill existing agencies: set `date_created` to the date portion of `date_added`

  2. Purpose
    - Allows admins to set when an agency truly started
    - Used to compute average contacts/week and contacts/month KPIs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'date_created'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN date_created date;
  END IF;
END $$;

UPDATE crm_agencies
SET date_created = (date_added AT TIME ZONE 'UTC')::date
WHERE date_created IS NULL AND date_added IS NOT NULL;
