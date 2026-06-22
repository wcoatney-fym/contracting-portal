/*
  # Add zaps_paused flag to crm_agencies

  1. Modified Tables
    - `crm_agencies`
      - `zaps_paused` (boolean, default false) - When true, webhook/zap calls are suppressed for this agency

  2. Notes
    - Defaults to false so all existing agencies continue firing zaps normally
    - Only set to true when CRM team adds an existing agency for backfill purposes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'zaps_paused'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN zaps_paused boolean DEFAULT false NOT NULL;
  END IF;
END $$;
