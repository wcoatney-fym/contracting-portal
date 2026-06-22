/*
  # Add form_type and agency columns to new_hires table

  ## Summary
  Adds tracking columns to support automated form routing for new hires.

  ## Changes
  - `new_hires` table:
    - Added `form_type` (text, default 'hip') — the form type to auto-send when this hire is processed
    - Added `agency` (text, default 'FYM') — the agency this hire belongs to

  ## Notes
  - Both columns have sensible defaults so existing records and Zapier payloads
    that don't include these fields will automatically use HIP/FYM, which is the
    primary automated workflow
  - These columns allow Zapier (or other callers) to optionally specify a different
    form type or agency per hire in the future with no code changes required
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'new_hires' AND column_name = 'form_type'
  ) THEN
    ALTER TABLE new_hires ADD COLUMN form_type text NOT NULL DEFAULT 'hip';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'new_hires' AND column_name = 'agency'
  ) THEN
    ALTER TABLE new_hires ADD COLUMN agency text NOT NULL DEFAULT 'FYM';
  END IF;
END $$;
