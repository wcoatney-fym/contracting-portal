/*
  # Add sync cursor columns to agency_ghl_configs

  1. Modified Tables
    - `agency_ghl_configs`
      - `sync_cursor` (text) - Stores the GHL startAfterId for resumable pagination
      - `sync_in_progress` (boolean) - Whether a chunked sync is currently running
      - `sync_total_expected` (integer) - Total contacts reported by GHL meta.total
      - `sync_fetched_so_far` (integer) - How many contacts have been fetched in current sync session

  2. Notes
    - Enables chunked/resumable sync to handle large contact lists (7000+)
    - Each edge function invocation fetches ~2000 contacts, saves cursor, and returns
    - Frontend calls repeatedly until complete
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_ghl_configs' AND column_name = 'sync_cursor'
  ) THEN
    ALTER TABLE agency_ghl_configs ADD COLUMN sync_cursor text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_ghl_configs' AND column_name = 'sync_in_progress'
  ) THEN
    ALTER TABLE agency_ghl_configs ADD COLUMN sync_in_progress boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_ghl_configs' AND column_name = 'sync_total_expected'
  ) THEN
    ALTER TABLE agency_ghl_configs ADD COLUMN sync_total_expected integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_ghl_configs' AND column_name = 'sync_fetched_so_far'
  ) THEN
    ALTER TABLE agency_ghl_configs ADD COLUMN sync_fetched_so_far integer NOT NULL DEFAULT 0;
  END IF;
END $$;
