/*
  # Extend agency_kpis with production tracking fields

  1. Modified Tables
    - `agency_kpis`
      - `active_clients` (integer) - currently active client count
      - `terminated_clients` (integer) - terminated clients count
      - `at_risk_clients` (integer) - at-risk flagged clients
      - `total_policies` (integer) - total active policies
      - `policies_this_month` (integer) - new policies written this month
      - `top_carrier` (text) - carrier with most active policies
      - `avg_policies_per_agent` (numeric) - average production per agent

  2. Also adds price_per_contact to crm_agencies for billing
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'active_clients') THEN
    ALTER TABLE agency_kpis ADD COLUMN active_clients integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'terminated_clients') THEN
    ALTER TABLE agency_kpis ADD COLUMN terminated_clients integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'at_risk_clients') THEN
    ALTER TABLE agency_kpis ADD COLUMN at_risk_clients integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'total_policies') THEN
    ALTER TABLE agency_kpis ADD COLUMN total_policies integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'policies_this_month') THEN
    ALTER TABLE agency_kpis ADD COLUMN policies_this_month integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'top_carrier') THEN
    ALTER TABLE agency_kpis ADD COLUMN top_carrier text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agency_kpis' AND column_name = 'avg_policies_per_agent') THEN
    ALTER TABLE agency_kpis ADD COLUMN avg_policies_per_agent numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_agencies' AND column_name = 'price_per_contact') THEN
    ALTER TABLE crm_agencies ADD COLUMN price_per_contact numeric DEFAULT 0;
  END IF;
END $$;
