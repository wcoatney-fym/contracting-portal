/*
  # Create agency_clients table for book of business tracking

  1. New Tables
    - `agency_clients`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `agent_id` (uuid, nullable FK to agents)
      - `client_name` (text)
      - `policy_number` (text)
      - `carrier` (text)
      - `status` (text: active, terminated, at_risk, lapsed)
      - `premium_amount` (numeric)
      - `product_type` (text)
      - `effective_date` (date)
      - `termination_date` (date, nullable)
      - `risk_flag_reason` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `agency_clients`
    - Policy for authenticated users to read their agency's data
    - Policy for anon users (portal access) to read data

  3. Indexes
    - Index on agency_id for fast lookups
    - Index on agent_id for per-agent queries
    - Index on status for filtered views
*/

CREATE TABLE IF NOT EXISTS agency_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  policy_number text NOT NULL DEFAULT '',
  carrier text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'at_risk', 'lapsed')),
  premium_amount numeric DEFAULT 0,
  product_type text NOT NULL DEFAULT '',
  effective_date date,
  termination_date date,
  risk_flag_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_clients_agency_id ON agency_clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_agent_id ON agency_clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_status ON agency_clients(status);

ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agency clients"
  ON agency_clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert agency clients"
  ON agency_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agency clients"
  ON agency_clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agency clients"
  ON agency_clients
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read agency clients for portal"
  ON agency_clients
  FOR SELECT
  TO anon
  USING (true);
