/*
  # Rename form_submissions → agent_intake

  Kills the naming collision between the portal's agent contracting intake table
  and the Sales Tracker's form_submissions policy table (two totally different things,
  same name, two DBs — a known footgun).

  ## Changes
  1. Rename table: form_submissions → agent_intake
  2. Rename index: idx_form_submissions_agent_id → idx_agent_intake_agent_id
  3. Drop old RLS policy; recreate under new name
  4. Flush PostgREST schema cache

  ## Reversible
  Run the inverse (RENAME TABLE agent_intake TO form_submissions, etc.) to roll back.
  No data is changed.
*/

-- 1. Rename the table
ALTER TABLE form_submissions RENAME TO agent_intake;

-- 2. Rename the index
ALTER INDEX idx_form_submissions_agent_id RENAME TO idx_agent_intake_agent_id;

-- 3. Drop the old RLS policy and recreate it for the renamed table
DROP POLICY IF EXISTS "Allow all access to form_submissions" ON agent_intake;

CREATE POLICY "Allow all access to agent_intake"
  ON agent_intake FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
