-- Migration: Universal Hub Login
-- Adds NPN + source to agents table, backfills NPN from agent_intake,
-- relaxes NOT NULL constraints for roster imports, enables universal login.

-- 1. Add new columns to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS npn text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'intake_form';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS resident_state text;

-- 2. Backfill NPN and resident_state from agent_intake for existing agents
UPDATE agents a
SET npn = ai.npn,
    resident_state = ai.resident_state
FROM agent_intake ai
WHERE ai.agent_id = a.id
  AND ai.npn IS NOT NULL
  AND ai.npn != ''
  AND (a.npn IS NULL OR a.npn = '');

-- 3. Relax NOT NULL constraints on intake-form-specific fields
-- These fields are required for intake-form agents but not for roster imports
ALTER TABLE agents ALTER COLUMN email DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN form_type DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN security_code DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN expiration_date DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN form_url DROP NOT NULL;

-- 4. Set defaults for columns that roster imports won't have
ALTER TABLE agents ALTER COLUMN email SET DEFAULT NULL;
ALTER TABLE agents ALTER COLUMN form_type SET DEFAULT NULL;
ALTER TABLE agents ALTER COLUMN security_code SET DEFAULT NULL;
ALTER TABLE agents ALTER COLUMN expiration_date SET DEFAULT NULL;
ALTER TABLE agents ALTER COLUMN form_url SET DEFAULT NULL;

-- 5. Create unique index on NPN for dedup (partial — only non-null, non-empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_npn_unique
  ON agents (npn)
  WHERE npn IS NOT NULL AND npn != '';

-- 6. Create index for universal login lookup (first_name + last_name + npn)
CREATE INDEX IF NOT EXISTS idx_agents_login_lookup
  ON agents (lower(first_name), lower(last_name), npn)
  WHERE npn IS NOT NULL AND npn != '';

-- 7. Ensure all existing intake-form agents have source = 'intake_form'
UPDATE agents SET source = 'intake_form' WHERE source IS NULL OR source = '';
