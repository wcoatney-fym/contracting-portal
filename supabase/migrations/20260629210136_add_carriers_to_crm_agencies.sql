/*
# Add carriers column to crm_agencies

1. Modified Tables
  - `crm_agencies`
    - Added `carriers` (text[], default '{}') - Array of carrier names enabled for this agency.
      Valid values: 'UNL', 'GTL', 'AHL', 'Manhattan', 'Heartland'

2. Notes
  - Stored as a text array for flexible toggling in the hierarchy UI.
  - No constraint on values to allow future carriers without a migration.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'carriers'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN carriers text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
