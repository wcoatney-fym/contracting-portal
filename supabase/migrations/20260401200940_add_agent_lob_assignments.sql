/*
  # Add Agent Lines of Business Assignments

  1. New Tables
    - `agent_lob_assignments`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to agents)
      - `line_of_business` (text) - e.g., 'HIP'
      - `carrier` (text) - e.g., 'UNL', 'GTL'
      - `writing_number` (text) - the agent's carrier writing number
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Composite index on agent_id + line_of_business + carrier for fast lookups
    - Unique constraint to prevent duplicate carrier entries per agent/LOB

  3. Security
    - Enable RLS on `agent_lob_assignments` table
    - Add access policies matching existing table patterns
*/

CREATE TABLE IF NOT EXISTS agent_lob_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  line_of_business text NOT NULL,
  carrier text NOT NULL,
  writing_number text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agent_id, line_of_business, carrier)
);

CREATE INDEX IF NOT EXISTS idx_agent_lob_agent_id ON agent_lob_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_lob_composite ON agent_lob_assignments(agent_id, line_of_business, carrier);

ALTER TABLE agent_lob_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on agent_lob_assignments"
  ON agent_lob_assignments FOR SELECT
  USING (true);

CREATE POLICY "Allow insert on agent_lob_assignments"
  ON agent_lob_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update on agent_lob_assignments"
  ON agent_lob_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on agent_lob_assignments"
  ON agent_lob_assignments FOR DELETE
  USING (true);
