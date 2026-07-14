-- Add aliases array to hierarchy_agencies for tracking AKA / DBA names
-- Used when an agency operates under multiple names or was previously
-- known by a different name (e.g. "Texas Medical Care Plans" = Vargas Investment Enterprises LLC)

ALTER TABLE hierarchy_agencies
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

-- Backfill known aliases
UPDATE hierarchy_agencies
  SET aliases = ARRAY['Texas Medical Care Plans']
  WHERE name = 'Vargas Investment Enterprises LLC';

UPDATE hierarchy_agencies
  SET aliases = ARRAY['Your Advantage Group, Inc']
  WHERE name = 'Your Advantage, Inc.';

UPDATE hierarchy_agencies
  SET aliases = ARRAY['Health Wise Insurance LLC']
  WHERE name = 'Health Wise';

UPDATE hierarchy_agencies
  SET aliases = ARRAY['Wisechoice Senior Advisors, LLC']
  WHERE name = 'Wisechoice';

UPDATE hierarchy_agencies
  SET aliases = ARRAY['Steel City Financial Services']
  WHERE name = 'Steel City Financial Services Inc';

COMMENT ON COLUMN hierarchy_agencies.aliases IS
  'AKA / DBA / former names for this agency. Used for search and display in the CRM tab.';
