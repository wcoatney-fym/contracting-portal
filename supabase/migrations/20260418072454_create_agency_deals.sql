/*
  # Create agency_deals table

  1. New Tables
    - `agency_deals`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to crm_agencies)
      - `ghl_deal_id` (text, unique) - external GHL deal identifier
      - `deal_name` (text) - name of the deal
      - `contact_name` (text, nullable) - associated contact name
      - `value` (numeric, default 0) - monetary value of the deal
      - `stage` (text) - current stage in pipeline
      - `status` (text) - open/won/lost/abandoned
      - `assigned_agent_name` (text, nullable) - agent working the deal
      - `close_date` (timestamptz, nullable) - when the deal was closed
      - `source` (text, nullable) - lead source
      - `synced_at` (timestamptz) - last synced from GHL
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `agency_deals` table
    - Add policies for authenticated users (select, insert, update, delete)

  3. Indexes
    - Index on agency_id for filtering by agency
    - Index on status for filtering by deal status
*/

CREATE TABLE IF NOT EXISTS agency_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id),
  ghl_deal_id text UNIQUE,
  deal_name text NOT NULL DEFAULT '',
  contact_name text,
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  assigned_agent_name text,
  close_date timestamptz,
  source text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_deals_agency_id ON agency_deals(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_deals_status ON agency_deals(status);

ALTER TABLE agency_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deals"
  ON agency_deals FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert deals"
  ON agency_deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update deals"
  ON agency_deals FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete deals"
  ON agency_deals FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
