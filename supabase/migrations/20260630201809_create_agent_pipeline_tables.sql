/*
# Create Agent Pipeline Tables

Tracks agents through the contracting pipeline stages, fed exclusively by GHL webhooks.

1. New Tables
  - `agent_pipeline`
    - `id` (uuid, primary key)
    - `ghl_opportunity_id` (text, unique) - GHL opportunity ID that drives this record
    - `ghl_pipeline_id` (text, nullable) - GHL pipeline UUID for reference
    - `ghl_stage_id` (text, nullable) - raw GHL stage ID received
    - `stage` (text, not null) - internal stage slug (one of 12 stages)
    - `agent_name` (text, not null) - full name from GHL contact
    - `first_name` (text, nullable) - parsed first name
    - `last_name` (text, nullable) - parsed last name
    - `email` (text, nullable) - agent email
    - `phone` (text, nullable) - agent phone
    - `agency` (text, nullable) - agency name derived from GHL location lookup
    - `agency_id` (uuid, FK to crm_agencies, nullable) - linked agency
    - `writing_numbers` (text, nullable) - manually editable for HIP Broker READY / HIP Career READY stages
    - `notes` (text, nullable) - internal notes
    - `stage_entered_at` (timestamptz) - when agent entered the current stage
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `agent_pipeline_stage_map`
    - `id` (uuid, primary key)
    - `ghl_stage_name` (text, unique) - GHL stage name as received in webhooks
    - `internal_stage` (text, not null) - maps to one of the 12 internal stage slugs
    - `display_order` (integer) - for UI ordering
    - `created_at` (timestamptz)

2. Security
  - Enable RLS on both tables.
  - Allow anon + authenticated full CRUD (single-tenant internal tool, no user isolation).

3. Indexes
  - `agent_pipeline`: indexes on agency_id, stage, ghl_opportunity_id
  - `agent_pipeline_stage_map`: unique index on ghl_stage_name

4. Seed Data
  - Pre-populate `agent_pipeline_stage_map` with 12 default GHL stage name -> internal stage mappings.

5. Important Notes
  - All records come exclusively via GHL webhook; no manual creation flow.
  - `writing_numbers` is the only field edited manually from the UI (for READY stages).
  - Stage constraint ensures data integrity across the 12 valid stages.
*/

-- Main pipeline table
CREATE TABLE IF NOT EXISTS agent_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_opportunity_id text UNIQUE NOT NULL,
  ghl_pipeline_id text,
  ghl_stage_id text,
  stage text NOT NULL DEFAULT 'hip_broker',
  agent_name text NOT NULL DEFAULT '',
  first_name text,
  last_name text,
  email text,
  phone text,
  agency text,
  agency_id uuid REFERENCES crm_agencies(id) ON DELETE SET NULL,
  writing_numbers text,
  notes text,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_pipeline_stage CHECK (stage IN (
    'hip_broker', 'hip_career', 'iaa', 'signed_iaa', 'bill_com',
    'crm', 'in_contracting', 'rts', 'hip_broker_ready',
    'hip_career_ready', 'actively_selling', 'terminated'
  ))
);

CREATE INDEX IF NOT EXISTS idx_agent_pipeline_agency_id ON agent_pipeline(agency_id);
CREATE INDEX IF NOT EXISTS idx_agent_pipeline_stage ON agent_pipeline(stage);

ALTER TABLE agent_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agent_pipeline" ON agent_pipeline;
CREATE POLICY "anon_select_agent_pipeline" ON agent_pipeline FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_agent_pipeline" ON agent_pipeline;
CREATE POLICY "anon_insert_agent_pipeline" ON agent_pipeline FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_agent_pipeline" ON agent_pipeline;
CREATE POLICY "anon_update_agent_pipeline" ON agent_pipeline FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_agent_pipeline" ON agent_pipeline;
CREATE POLICY "anon_delete_agent_pipeline" ON agent_pipeline FOR DELETE
  TO anon, authenticated USING (true);

-- Stage mapping table
CREATE TABLE IF NOT EXISTS agent_pipeline_stage_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_stage_name text UNIQUE NOT NULL,
  internal_stage text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_internal_stage CHECK (internal_stage IN (
    'hip_broker', 'hip_career', 'iaa', 'signed_iaa', 'bill_com',
    'crm', 'in_contracting', 'rts', 'hip_broker_ready',
    'hip_career_ready', 'actively_selling', 'terminated'
  ))
);

ALTER TABLE agent_pipeline_stage_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stage_map" ON agent_pipeline_stage_map;
CREATE POLICY "anon_select_stage_map" ON agent_pipeline_stage_map FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_stage_map" ON agent_pipeline_stage_map;
CREATE POLICY "anon_insert_stage_map" ON agent_pipeline_stage_map FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_stage_map" ON agent_pipeline_stage_map;
CREATE POLICY "anon_update_stage_map" ON agent_pipeline_stage_map FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_stage_map" ON agent_pipeline_stage_map;
CREATE POLICY "anon_delete_stage_map" ON agent_pipeline_stage_map FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default stage mappings
INSERT INTO agent_pipeline_stage_map (ghl_stage_name, internal_stage, display_order) VALUES
  ('HIP Broker', 'hip_broker', 1),
  ('HIP Career', 'hip_career', 2),
  ('IAA', 'iaa', 3),
  ('Signed IAA', 'signed_iaa', 4),
  ('Bill.com', 'bill_com', 5),
  ('CRM', 'crm', 6),
  ('In Contracting Process', 'in_contracting', 7),
  ('RTS', 'rts', 8),
  ('HIP Broker READY', 'hip_broker_ready', 9),
  ('HIP Career READY', 'hip_career_ready', 10),
  ('Actively Selling', 'actively_selling', 11),
  ('Terminated', 'terminated', 12)
ON CONFLICT (ghl_stage_name) DO NOTHING;
