/*
  # Create Pipeline History Table

  1. New Tables
    - `crm_pipeline_history`
      - `id` (uuid, primary key)
      - `pipeline_record_id` (uuid, nullable - reference to original crm_pipeline record)
      - `agent_id` (uuid, nullable - reference to agents table)
      - `agency` (text, not null)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `seat_number` (text)
      - `crm_number` (text)
      - `agent_npn` (text)
      - `final_stage` (text - last known stage)
      - `zap_sent_at` (timestamptz)
      - `user_created_at` (timestamptz)
      - `seat_filled_at` (timestamptz)
      - `sunfire_workflows_at` (timestamptz)
      - `agency_workflows_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `terminated_at` (timestamptz)
      - `notes` (text)
      - `entered_at` (timestamptz - when agent entered the pipeline)
      - `created_at` (timestamptz - when this history record was created)

  2. Security
    - Enable RLS on `crm_pipeline_history` table
    - Authenticated users can read and insert (immutable - no update/delete from UI)

  3. Indexes
    - `idx_crm_pipeline_history_agency` for agency grouping
    - `idx_crm_pipeline_history_entered_at` for chronological queries
    - `idx_crm_pipeline_history_pipeline_record_id` for linking back to active records
*/

CREATE TABLE IF NOT EXISTS crm_pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_record_id uuid,
  agent_id uuid,
  agency text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  seat_number text NOT NULL DEFAULT '',
  crm_number text NOT NULL DEFAULT '',
  agent_npn text NOT NULL DEFAULT '',
  final_stage text NOT NULL DEFAULT 'processing',
  zap_sent_at timestamptz,
  user_created_at timestamptz,
  seat_filled_at timestamptz,
  sunfire_workflows_at timestamptz,
  agency_workflows_at timestamptz,
  completed_at timestamptz,
  terminated_at timestamptz,
  notes text NOT NULL DEFAULT '',
  entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_pipeline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pipeline history"
  ON crm_pipeline_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pipeline history"
  ON crm_pipeline_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pipeline history"
  ON crm_pipeline_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read pipeline history"
  ON crm_pipeline_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert pipeline history"
  ON crm_pipeline_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update pipeline history"
  ON crm_pipeline_history
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_agency ON crm_pipeline_history (agency);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_entered_at ON crm_pipeline_history (entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_pipeline_record_id ON crm_pipeline_history (pipeline_record_id);