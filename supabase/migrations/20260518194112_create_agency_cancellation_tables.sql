/*
  # Create agency cancellation upload tables

  1. New Tables
    - `agency_cancellation_uploads`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `file_name` (text) - original file name
      - `row_count` (integer) - number of data rows
      - `status` (text) - 'success' or 'rejected'
      - `errors` (jsonb, nullable) - validation errors if rejected
      - `created_at` (timestamptz)
    - `agency_cancellations`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `upload_id` (uuid, FK to agency_cancellation_uploads)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `tag` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Anon select/insert policies for portal access (scoped to agency_id match)
*/

-- Upload tracking table
CREATE TABLE IF NOT EXISTS agency_cancellation_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_cancellation_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert cancellation uploads for portal"
  ON agency_cancellation_uploads
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  );

CREATE POLICY "Anon can view cancellation uploads for active agencies"
  ON agency_cancellation_uploads
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  );

CREATE POLICY "Authenticated can view all cancellation uploads"
  ON agency_cancellation_uploads
  FOR SELECT
  TO authenticated
  USING (true);

-- Individual cancellation rows table
CREATE TABLE IF NOT EXISTS agency_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES agency_cancellation_uploads(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert cancellations for portal"
  ON agency_cancellations
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  );

CREATE POLICY "Anon can view cancellations for active agencies"
  ON agency_cancellations
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_agencies WHERE id = agency_id AND is_active = true
    )
  );

CREATE POLICY "Authenticated can view all cancellations"
  ON agency_cancellations
  FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_uploads_agency ON agency_cancellation_uploads(agency_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_agency ON agency_cancellations(agency_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_upload ON agency_cancellations(upload_id);