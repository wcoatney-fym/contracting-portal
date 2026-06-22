/*
  # Add Terminated Status and terminated_at Columns

  1. Modified Tables
    - `agents`
      - Updated status CHECK constraint to include 'terminated'
      - Added `terminated_at` (timestamptz, nullable) - when the agent was terminated
    - `crm_pipeline`
      - Added `terminated_at` (timestamptz, nullable) - marks pipeline record for 7-day notification then cleanup

  2. Indexes
    - Added index on `crm_pipeline.terminated_at` for efficient cleanup queries

  3. Important Notes
    - Terminated agents have their CRM roster seat cleared and crm_onboarded set to false
    - Pipeline records with terminated_at are shown in a notification area for 7 days before deletion
*/

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;

ALTER TABLE agents ADD CONSTRAINT agents_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'in-progress'::text,
    'completed'::text,
    'expired'::text,
    'terminated'::text
  ]));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'terminated_at'
  ) THEN
    ALTER TABLE agents ADD COLUMN terminated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_pipeline' AND column_name = 'terminated_at'
  ) THEN
    ALTER TABLE crm_pipeline ADD COLUMN terminated_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_terminated_at ON crm_pipeline(terminated_at);
CREATE INDEX IF NOT EXISTS idx_agents_terminated_at ON agents(terminated_at);
