/*
# Agent pipeline stage step checklists

Adds per-stage checklists so we can track which steps each agent has
completed within a stage. Steps are editable from the portal (no code
changes) and completions are stored per agent with a timestamp so the
detail modal can show a real completion timeline.

1. New table
  - `agent_pipeline_stage_steps`
    - `id` (uuid, pk)
    - `internal_stage` (text) - one of the 12 pipeline stage slugs
    - `label` (text) - the step description shown in the checklist
    - `display_order` (int) - ordering within the stage
    - `active` (bool, default true) - soft-hide a step without deleting history
    - `created_at` (timestamptz)

2. Change to `agent_pipeline`
  - `completed_steps` (jsonb, default '{}') - map of step_id -> completed_at ISO
    string. Presence of a key means done; value is when it was checked.

3. Security
  - RLS enabled; anon + authenticated full access (single-tenant internal tool),
    consistent with the rest of the pipeline tables.

4. Seed
  - Sensible starter steps for a few stages so the UI has something to show.
    Teams edit/extend these from the settings panel.
*/

-- Steps definition table
CREATE TABLE IF NOT EXISTS agent_pipeline_stage_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_stage text NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_steps_stage
  ON agent_pipeline_stage_steps (internal_stage, display_order);

ALTER TABLE agent_pipeline_stage_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_pipeline_stage_steps' AND policyname = 'stage_steps_all_access'
  ) THEN
    CREATE POLICY stage_steps_all_access ON agent_pipeline_stage_steps
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Per-agent completion map
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_pipeline' AND column_name = 'completed_steps'
  ) THEN
    ALTER TABLE agent_pipeline ADD COLUMN completed_steps jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Seed starter steps (idempotent: only insert when the stage has none)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agent_pipeline_stage_steps) THEN
    INSERT INTO agent_pipeline_stage_steps (internal_stage, label, display_order) VALUES
      ('iaa', 'IAA sent', 1),
      ('iaa', 'IAA signed', 2),
      ('iaa', 'IAA countersigned', 3),
      ('signed_iaa', 'IAA on file', 1),
      ('signed_iaa', 'W-9 collected', 2),
      ('bill_com', 'Bill.com invite sent', 1),
      ('bill_com', 'Bill.com account connected', 2),
      ('crm', 'CRM sub-account created', 1),
      ('crm', 'Agent invited to CRM', 2),
      ('crm', 'Agent logged in', 3),
      ('in_contracting', 'Carrier apps submitted', 1),
      ('in_contracting', 'Background check clear', 2),
      ('in_contracting', 'Carrier approvals received', 3),
      ('rts', 'Ready-to-sell confirmed', 1),
      ('hip_broker_ready', 'Writing numbers issued', 1),
      ('hip_broker_ready', 'Onboarding call complete', 2),
      ('hip_career_ready', 'Writing numbers issued', 1),
      ('hip_career_ready', 'Onboarding call complete', 2);
  END IF;
END $$;
