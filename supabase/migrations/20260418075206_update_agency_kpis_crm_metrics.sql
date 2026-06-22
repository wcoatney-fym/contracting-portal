/*
  # Update agency_kpis with CRM-specific metrics

  1. Modified Tables
    - `agency_kpis`
      - Added `total_contacts` (integer, default 0) - cumulative contact count
      - Added `contacts_week` (integer, default 0) - contacts added this week
      - Added `contacts_month` (integer, default 0) - contacts added this month
      - Added `cross_sell_opportunities` (integer, default 0) - cross-sell opps created
      - Added `saved_policies` (integer, default 0) - policies saved/retained
      - Added `cancellations` (integer, default 0) - policy cancellations
      - Added `agents_onboarded` (integer, default 0) - agents fully onboarded
      - Added `agents_in_pipeline` (integer, default 0) - agents currently in pipeline

  2. Notes
    - Existing columns (deals_closed, revenue, pipeline_value) are kept for backward compat
    - New columns default to 0 and are safe to add
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'total_contacts'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN total_contacts integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'contacts_week'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN contacts_week integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'contacts_month'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN contacts_month integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'cross_sell_opportunities'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN cross_sell_opportunities integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'saved_policies'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN saved_policies integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'cancellations'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN cancellations integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'agents_onboarded'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN agents_onboarded integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_kpis' AND column_name = 'agents_in_pipeline'
  ) THEN
    ALTER TABLE agency_kpis ADD COLUMN agents_in_pipeline integer NOT NULL DEFAULT 0;
  END IF;
END $$;
