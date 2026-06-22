/*
  # Create Dashboard Analytics Tables and Columns

  1. New Tables
    - `agency_revenue_log`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `month` (date) - first day of the billing month
      - `active_client_count` (integer)
      - `price_per_contact` (numeric)
      - `total_billed` (numeric)
      - `created_at` (timestamptz)
    - `dashboard_snapshots`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, FK to crm_agencies)
      - `snapshot_date` (date)
      - `active_clients` (integer)
      - `at_risk_clients` (integer)
      - `saved_policies` (integer)
      - `cross_sell_opps` (integer)
      - `cross_sell_conversions` (integer)
      - `retention_rate` (numeric)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `crm_agencies` - add avg_annual_premium, cost_per_client_year
    - `agency_kpis` - add retention_rate, cross_sell_conversions, save_rate
    - `agency_clients` - add is_cross_sell, save_count

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated and anon access (matching existing portal patterns)
*/

-- agency_revenue_log
CREATE TABLE IF NOT EXISTS agency_revenue_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  month date NOT NULL,
  active_client_count integer NOT NULL DEFAULT 0,
  price_per_contact numeric NOT NULL DEFAULT 0,
  total_billed numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, month)
);

ALTER TABLE agency_revenue_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agency_revenue_log"
  ON agency_revenue_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert agency_revenue_log"
  ON agency_revenue_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update agency_revenue_log"
  ON agency_revenue_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- dashboard_snapshots
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES crm_agencies(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  active_clients integer NOT NULL DEFAULT 0,
  at_risk_clients integer NOT NULL DEFAULT 0,
  saved_policies integer NOT NULL DEFAULT 0,
  cross_sell_opps integer NOT NULL DEFAULT 0,
  cross_sell_conversions integer NOT NULL DEFAULT 0,
  retention_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, snapshot_date)
);

ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dashboard_snapshots"
  ON dashboard_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dashboard_snapshots"
  ON dashboard_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon users can read dashboard_snapshots"
  ON dashboard_snapshots FOR SELECT
  TO anon
  USING (true);

-- Add columns to crm_agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'avg_annual_premium'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN avg_annual_premium numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_agencies' AND column_name = 'cost_per_client_year'
  ) THEN
    ALTER TABLE crm_agencies ADD COLUMN cost_per_client_year numeric DEFAULT 0;
  END IF;
END $$;

-- Add columns to agency_kpis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'retention_rate'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN retention_rate numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'cross_sell_conversions'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN cross_sell_conversions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'save_rate'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN save_rate numeric DEFAULT 0;
  END IF;
END $$;

-- Add columns to agency_clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'is_cross_sell'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN is_cross_sell boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_clients' AND column_name = 'save_count'
  ) THEN
    ALTER TABLE agency_clients ADD COLUMN save_count integer DEFAULT 0;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_revenue_log_agency_month ON agency_revenue_log(agency_id, month);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_agency_date ON dashboard_snapshots(agency_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_agency_clients_is_cross_sell ON agency_clients(agency_id) WHERE is_cross_sell = true;
