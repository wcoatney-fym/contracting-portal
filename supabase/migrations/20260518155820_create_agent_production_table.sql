/*
  # Create agent_production table for per-agent performance tracking

  1. New Tables
    - `agent_production`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `agent_id` (uuid, FK to agents)
      - `period_start` (date)
      - `period_end` (date)
      - `policies_written` (integer)
      - `policies_active` (integer)
      - `policies_cancelled` (integer)
      - `total_premium` (numeric)
      - `carrier` (text)
      - `computed_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies for authenticated and anon portal access

  3. Indexes
    - Composite index on agency_id + period_start for time-series queries
    - Index on agent_id for per-agent lookups
*/

CREATE TABLE IF NOT EXISTS agent_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  policies_written integer DEFAULT 0,
  policies_active integer DEFAULT 0,
  policies_cancelled integer DEFAULT 0,
  total_premium numeric DEFAULT 0,
  carrier text NOT NULL DEFAULT '',
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_production_agency_period ON agent_production(agency_id, period_start);
CREATE INDEX IF NOT EXISTS idx_agent_production_agent ON agent_production(agent_id);

ALTER TABLE agent_production ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent production"
  ON agent_production
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert agent production"
  ON agent_production
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agent production"
  ON agent_production
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agent production"
  ON agent_production
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read agent production for portal"
  ON agent_production
  FOR SELECT
  TO anon
  USING (true);
