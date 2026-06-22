/*
  # Create CRM Roster tables

  1. New Tables
    - `crm_roster_uploads`
      - `id` (uuid, primary key)
      - `file_name` (text) - original CSV file name
      - `row_count` (integer) - number of rows imported
      - `headers` (jsonb) - array of column headers from CSV
      - `uploaded_at` (timestamptz) - when the file was uploaded
    - `crm_roster`
      - `id` (uuid, primary key)
      - `upload_id` (uuid, FK to crm_roster_uploads) - which upload batch
      - `row_data` (jsonb) - the row data as key-value pairs matching headers
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage data
*/

CREATE TABLE IF NOT EXISTS crm_roster_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL DEFAULT '',
  row_count integer NOT NULL DEFAULT 0,
  headers jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE crm_roster_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roster uploads"
  ON crm_roster_uploads
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert roster uploads"
  ON crm_roster_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete roster uploads"
  ON crm_roster_uploads
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS crm_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES crm_roster_uploads(id) ON DELETE CASCADE,
  row_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roster entries"
  ON crm_roster
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert roster entries"
  ON crm_roster
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete roster entries"
  ON crm_roster
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
