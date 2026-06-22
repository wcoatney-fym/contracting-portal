/*
  # Add agency column to CRM roster uploads

  1. Modified Tables
    - `crm_roster_uploads`
      - Add `agency` column (text, not null, default 'FYM')
      - Add unique constraint on `agency` so only one upload per agency is allowed

  2. Notes
    - Supports three agencies: FYM, Wisechoice, Aspire
    - Each agency can have at most one active roster upload at a time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_roster_uploads' AND column_name = 'agency'
  ) THEN
    ALTER TABLE crm_roster_uploads
      ADD COLUMN agency text NOT NULL DEFAULT 'FYM'
      CHECK (agency IN ('FYM', 'Wisechoice', 'Aspire'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_roster_uploads_agency_unique'
  ) THEN
    ALTER TABLE crm_roster_uploads
      ADD CONSTRAINT crm_roster_uploads_agency_unique UNIQUE (agency);
  END IF;
END $$;