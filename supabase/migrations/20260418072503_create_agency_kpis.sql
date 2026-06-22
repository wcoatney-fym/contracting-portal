/*
  # Create agency_kpis table

  1. New Tables
    - `agency_kpis`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to crm_agencies)
      - `period_type` (text) - week/month/quarter/year
      - `period_start` (date) - start of the period
      - `period_end` (date) - end of the period
      - `deals_closed` (integer, default 0) - number of deals closed
      - `revenue` (numeric, default 0) - total revenue in period
      - `pipeline_value` (numeric, default 0) - active pipeline value
      - `computed_at` (timestamptz) - when the KPI was last calculated

  2. Security
    - Enable RLS on `agency_kpis` table
    - Add policies for authenticated users (select, insert, update, delete)

  3. Indexes
    - Composite index on (agency_id, period_type, period_start) for lookups
*/

CREATE TABLE IF NOT EXISTS agency_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id),
  period_type text NOT NULL DEFAULT 'month',
  period_start date NOT NULL,
  period_end date NOT NULL,
  deals_closed integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  pipeline_value numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_kpis_lookup
  ON agency_kpis(agency_id, period_type, period_start);

ALTER TABLE agency_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read kpis"
  ON agency_kpis FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert kpis"
  ON agency_kpis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update kpis"
  ON agency_kpis FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete kpis"
  ON agency_kpis FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
