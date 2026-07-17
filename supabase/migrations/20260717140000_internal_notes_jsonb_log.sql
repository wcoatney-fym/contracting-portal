-- Migration: Convert internal_notes from text to jsonb array of timestamped entries
-- Each entry: { text: string, created_at: ISO8601 string }
-- Existing plain-text notes are migrated into a single entry with the current timestamp.

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
