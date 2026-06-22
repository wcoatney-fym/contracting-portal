/*
  # Add Onboarding Workflow Tables and Columns

  1. Modified Tables
    - `crm_agencies`
      - Add `csr_confirmed` (boolean, default false) - Whether CSR assignment is confirmed
      - Add `roster_confirmed` (boolean, default false) - Whether roster upload is confirmed
      - Add `dba_confirmed` (boolean, default false) - Whether DBA upload is confirmed
    - `crm_roster_uploads`
      - Remove CHECK constraint limiting agency to FYM/Wisechoice/Aspire
      - Remove UNIQUE constraint on agency (allow multiple agencies)

  2. New Tables
    - `crm_notifications`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies, nullable)
      - `type` (text) - Notification type (csr_confirmed, roster_uploaded, dba_uploaded, etc.)
      - `message` (text) - Human-readable notification message
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz, default now())

    - `crm_dba_uploads`
      - `id` (uuid, primary key)
      - `agency` (text, unique) - Agency name
      - `file_name` (text) - Original CSV file name
      - `row_count` (integer) - Number of rows imported
      - `headers` (jsonb) - Array of column headers
      - `uploaded_at` (timestamptz, default now())

    - `crm_dba_rows`
      - `id` (uuid, primary key)
      - `upload_id` (uuid, FK to crm_dba_uploads, cascade delete)
      - `row_data` (jsonb) - Row data as key-value pairs
      - `created_at` (timestamptz, default now())

    - `crm_templates`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Template display name
      - `description` (text, default '')
      - `file_name` (text) - Original uploaded file name
      - `headers` (jsonb) - Array of column header names
      - `sample_rows` (jsonb, default '[]') - Optional sample data rows
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  3. Security
    - RLS enabled on all new tables
    - Policies for authenticated users on all CRUD operations

  4. Data Updates
    - Set csr_confirmed, roster_confirmed, dba_confirmed to true for existing onboarding_complete agencies
*/

-- Add confirmation columns to crm_agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'csr_confirmed'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN csr_confirmed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'roster_confirmed'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN roster_confirmed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'dba_confirmed'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN dba_confirmed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Set all confirmed flags to true for agencies that are already onboarding_complete
UPDATE crm_agencies
SET csr_confirmed = true, roster_confirmed = true, dba_confirmed = true
WHERE onboarding_status = 'onboarding_complete';

-- Remove the CHECK constraint on crm_roster_uploads.agency so new agencies can use it
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'crm_roster_uploads'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%agency%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE crm_roster_uploads DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Remove the unique constraint on agency so multiple uploads can exist (we handle latest in code)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_roster_uploads_agency_unique'
  ) THEN
    ALTER TABLE crm_roster_uploads DROP CONSTRAINT crm_roster_uploads_agency_unique;
  END IF;
END $$;

-- Create crm_notifications table
CREATE TABLE IF NOT EXISTS crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES crm_agencies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notifications"
  ON crm_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert notifications"
  ON crm_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update notifications"
  ON crm_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete notifications"
  ON crm_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create crm_dba_uploads table
CREATE TABLE IF NOT EXISTS crm_dba_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency text UNIQUE NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  row_count integer NOT NULL DEFAULT 0,
  headers jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE crm_dba_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dba uploads"
  ON crm_dba_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert dba uploads"
  ON crm_dba_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update dba uploads"
  ON crm_dba_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete dba uploads"
  ON crm_dba_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create crm_dba_rows table
CREATE TABLE IF NOT EXISTS crm_dba_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES crm_dba_uploads(id) ON DELETE CASCADE,
  row_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_dba_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dba rows"
  ON crm_dba_rows FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert dba rows"
  ON crm_dba_rows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete dba rows"
  ON crm_dba_rows FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create crm_templates table
CREATE TABLE IF NOT EXISTS crm_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  headers jsonb NOT NULL DEFAULT '[]'::jsonb,
  sample_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read templates"
  ON crm_templates FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert templates"
  ON crm_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update templates"
  ON crm_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete templates"
  ON crm_templates FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
