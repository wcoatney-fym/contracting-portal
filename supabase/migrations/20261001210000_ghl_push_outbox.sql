-- GHL push outbox — catch EVERY agent_pipeline stage-change write path.
--
-- Problem: app→GHL sync only fired when the frontend Pipeline tab called the
-- push-contracting-stage edge fn after a stage change. Bulk cleanups, Tracking
-- tab edits, and direct DB writes bypassed GHL entirely.
--
-- Fix (outbox pattern):
--   1) agent_pipeline.ghl_synced_at — writers that already handled the GHL
--      push (push-contracting-stage, contracting-pipeline-webhook, bulk sync)
--      stamp this column in the SAME update. The trigger skips stamped writes.
--   2) ghl_push_queue — outbox rows for every unstamped stage change.
--   3) trg_agent_pipeline_ghl_outbox — AFTER UPDATE trigger that enqueues.
--
-- Drained by push-contracting-stage action=dispatch (per-minute pg_cron on
-- rcbzag) with retry/backoff, dead-letter at 5 attempts, Slack backlog alert.
--
-- Additive only. No data changes. Reversible: DROP TRIGGER + DROP TABLE.

-- 1) Sync stamp column
ALTER TABLE agent_pipeline ADD COLUMN IF NOT EXISTS ghl_synced_at timestamptz;

COMMENT ON COLUMN agent_pipeline.ghl_synced_at IS
  'Stamped by writers that already handled the GHL push (edge fns). Stage changes without a fresh stamp are enqueued to ghl_push_queue by trigger.';

-- 2) Outbox table
CREATE TABLE IF NOT EXISTS ghl_push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES agent_pipeline(id) ON DELETE CASCADE,
  old_stage text,
  new_stage text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'success', 'dead', 'superseded')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

COMMENT ON TABLE ghl_push_queue IS
  'Outbox for agent_pipeline stage changes that still need a GHL push. Written by trigger, drained by push-contracting-stage action=dispatch.';

CREATE INDEX IF NOT EXISTS idx_ghl_push_queue_due
  ON ghl_push_queue (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_ghl_push_queue_pipeline
  ON ghl_push_queue (pipeline_id, status);

-- RLS: locked down. Dispatcher runs as the authenticated portal service
-- account (legacy JWT keys disabled on akhojh — see _shared/portal-db.ts),
-- so authenticated gets narrow SELECT/UPDATE. Inserts happen only via the
-- SECURITY DEFINER trigger function. anon gets nothing.
ALTER TABLE ghl_push_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ghl_push_queue FROM anon, authenticated;
GRANT SELECT, UPDATE ON ghl_push_queue TO authenticated;

DROP POLICY IF EXISTS "authenticated_select_ghl_push_queue" ON ghl_push_queue;
CREATE POLICY "authenticated_select_ghl_push_queue"
  ON ghl_push_queue FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_ghl_push_queue" ON ghl_push_queue;
CREATE POLICY "authenticated_update_ghl_push_queue"
  ON ghl_push_queue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3) Enqueue trigger
CREATE OR REPLACE FUNCTION enqueue_ghl_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Writer stamped the sync itself (edge-fn push / GHL-origin write) — skip.
  IF NEW.ghl_synced_at IS DISTINCT FROM OLD.ghl_synced_at THEN
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    -- Newer change supersedes anything still waiting for this record.
    UPDATE ghl_push_queue
       SET status = 'superseded', updated_at = now()
     WHERE pipeline_id = NEW.id
       AND status IN ('queued', 'processing');

    INSERT INTO ghl_push_queue (pipeline_id, old_stage, new_stage)
    VALUES (NEW.id, OLD.stage, NEW.stage);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_agent_pipeline_ghl_outbox ON agent_pipeline;
CREATE TRIGGER trg_agent_pipeline_ghl_outbox
  AFTER UPDATE ON agent_pipeline
  FOR EACH ROW EXECUTE FUNCTION enqueue_ghl_push();
