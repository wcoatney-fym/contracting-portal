/*
  # Add Agency Type and Parent Agency Hierarchy

  1. Modified Tables
    - `crm_agencies`
      - Added `agency_type` (text, not null, default 'main') - Either 'main' or 'sub'
      - Added `parent_agency_id` (uuid, nullable) - Foreign key to crm_agencies for sub-agencies

  2. Constraints
    - `agency_type` must be 'main' or 'sub'
    - `parent_agency_id` must be null when agency_type is 'main'
    - `parent_agency_id` must not be null when agency_type is 'sub'
    - Foreign key from parent_agency_id to crm_agencies(id)

  3. Data Changes
    - All existing agencies default to 'main' type
    - Aspire and Wisechoice are set as sub-agencies under FYM

  4. Notes
    - Hierarchy is always one level deep (sub-agencies cannot have children)
    - Each agency maintains independent CSR assignment and onboarding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'agency_type'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN agency_type text NOT NULL DEFAULT 'main';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'parent_agency_id'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN parent_agency_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_agencies_agency_type_check' AND table_name = 'crm_agencies'
  ) THEN
    ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_agency_type_check
      CHECK (agency_type IN ('main', 'sub'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_agencies_parent_type_check' AND table_name = 'crm_agencies'
  ) THEN
    ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_parent_type_check
      CHECK (
        (agency_type = 'main' AND parent_agency_id IS NULL) OR
        (agency_type = 'sub' AND parent_agency_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_agencies_parent_agency_fk' AND table_name = 'crm_agencies'
  ) THEN
    ALTER TABLE crm_agencies ADD CONSTRAINT crm_agencies_parent_agency_fk
      FOREIGN KEY (parent_agency_id) REFERENCES crm_agencies(id);
  END IF;
END $$;

UPDATE crm_agencies
SET agency_type = 'sub',
    parent_agency_id = (SELECT id FROM crm_agencies WHERE name = 'FYM')
WHERE name IN ('Wisechoice', 'Aspire')
  AND agency_type = 'main';
