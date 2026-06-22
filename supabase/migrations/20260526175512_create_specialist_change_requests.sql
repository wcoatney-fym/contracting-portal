/*
  # Create Specialist Change Requests Table

  1. New Tables
    - `specialist_change_requests`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `product_number` (integer, 1-5)
      - `requested_full_name` (text - new specialist name requested)
      - `requested_mobile` (text - new specialist mobile requested)
      - `status` (text - pending, calendar_added, confirmed)
      - `submitted_by` (text - name of person who submitted)
      - `calendar_added_at` (timestamptz, nullable)
      - `confirmed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated can read, insert, update
    - Anon can read and insert (portal submits requests)

  3. Notes
    - Agencies submit requests from the portal (anon)
    - CRM team manages approval from the admin (authenticated)
*/

CREATE TABLE IF NOT EXISTS specialist_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  product_number integer NOT NULL,
  requested_full_name text NOT NULL DEFAULT '',
  requested_mobile text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  submitted_by text NOT NULL DEFAULT '',
  calendar_added_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_change_requests_status_check CHECK (status IN ('pending', 'calendar_added', 'confirmed')),
  CONSTRAINT specialist_change_requests_product_check CHECK (product_number >= 1 AND product_number <= 5)
);

ALTER TABLE specialist_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read specialist change requests"
  ON specialist_change_requests FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert specialist change requests"
  ON specialist_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update specialist change requests"
  ON specialist_change_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read specialist change requests"
  ON specialist_change_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert specialist change requests"
  ON specialist_change_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_specialist_change_requests_agency ON specialist_change_requests (agency_id);
CREATE INDEX IF NOT EXISTS idx_specialist_change_requests_status ON specialist_change_requests (status);