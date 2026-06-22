/*
  # Create Termination Audit Log

  1. New Tables
    - `crm_termination_log`
      - `id` (uuid, primary key)
      - `agent_name` (text, not null) - full name of terminated agent
      - `agent_npn` (text, not null, default '') - agent's NPN number
      - `status` (text, not null, default 'terminated') - termination status
      - `agency` (text, not null) - agency the agent belonged to
      - `terminated_at` (timestamptz, default now()) - when the termination occurred
      - `created_at` (timestamptz, default now()) - when this log record was created

  2. Security
    - Enable RLS on `crm_termination_log` table
    - Authenticated users can read and insert
    - Anon users can read and insert (portal access)

  3. Indexes
    - `idx_crm_termination_log_agency` for agency filtering
    - `idx_crm_termination_log_terminated_at` for chronological ordering
*/

CREATE TABLE IF NOT EXISTS crm_termination_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  agent_npn text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'terminated',
  agency text NOT NULL,
  terminated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_termination_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read termination log"
  ON crm_termination_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert termination log"
  ON crm_termination_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read termination log"
  ON crm_termination_log
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert termination log"
  ON crm_termination_log
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_termination_log_agency ON crm_termination_log (agency);
CREATE INDEX IF NOT EXISTS idx_crm_termination_log_terminated_at ON crm_termination_log (terminated_at DESC);
