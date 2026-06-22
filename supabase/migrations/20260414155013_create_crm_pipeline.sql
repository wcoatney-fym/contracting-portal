/*
  # Create CRM Onboarding Pipeline

  Tracks agent progress through the CRM onboarding pipeline stages.
  Each record represents one agent moving through the onboarding flow.

  1. New Tables
    - `crm_pipeline`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references agents)
      - `agency` (text) - FYM, Wisechoice, or Aspire
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `seat_number` (text)
      - `crm_number` (text)
      - `agent_npn` (text)
      - `stage` (text) - current pipeline stage
      - `zap_sent_at` (timestamptz) - when Zapier webhook was fired
      - `user_created_at` (timestamptz) - when user creation confirmed
      - `seat_filled_at` (timestamptz) - when seat custom values populated
      - `sunfire_workflows_at` (timestamptz) - when Sunfire workflow adjustments completed
      - `agency_workflows_at` (timestamptz) - when agency workflow adjustments completed
      - `completed_at` (timestamptz) - when entire pipeline finished
      - `notes` (text) - optional notes from CRM team
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `crm_pipeline` table
    - Add policies for authenticated users to read, insert, update, and delete

  3. Important Notes
    - Pipeline stages: zap_sent, user_created, seat_filled, sunfire_workflows, agency_workflows, completed
    - The first three stages are automated; the last two are manual CRM team tasks
*/

CREATE TABLE IF NOT EXISTS crm_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  agency text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  seat_number text NOT NULL DEFAULT '',
  crm_number text NOT NULL DEFAULT '',
  agent_npn text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'zap_sent',
  zap_sent_at timestamptz DEFAULT now(),
  user_created_at timestamptz,
  seat_filled_at timestamptz,
  sunfire_workflows_at timestamptz,
  agency_workflows_at timestamptz,
  completed_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pipeline"
  ON crm_pipeline
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pipeline"
  ON crm_pipeline
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pipeline"
  ON crm_pipeline
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pipeline"
  ON crm_pipeline
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stage ON crm_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_agency ON crm_pipeline(agency);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_agent_id ON crm_pipeline(agent_id);
