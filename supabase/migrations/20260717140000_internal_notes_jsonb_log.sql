-- Migration: Add internal_notes column and convert to jsonb timestamped log
-- Handles the case where the column was never previously added to prod.
-- Each entry: { text: string, created_at: ISO8601 string }
-- Existing plain-text notes (if any) are migrated into a single entry.

-- Step 1: Add the column if it doesn't already exist
ALTER TABLE public.hierarchy_agencies
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Step 2: Convert to jsonb timestamped log
ALTER TABLE hierarchy_agencies
  ALTER COLUMN internal_notes TYPE jsonb
  USING CASE
    WHEN internal_notes IS NULL OR trim(internal_notes) = '' THEN NULL
    ELSE jsonb_build_array(
      jsonb_build_object(
        'text',       internal_notes,
        'created_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
  END;

COMMENT ON COLUMN hierarchy_agencies.internal_notes IS
  'Timestamped internal notes log. Array of {text, created_at} objects, newest first. Managed by the FYM portal UI.';
