-- Track which department made each pipeline stage change
-- Values: 'contracting_portal', 'training_hub', 'ghl_webhook', 'system'
ALTER TABLE agent_pipeline
  ADD COLUMN IF NOT EXISTS updated_by_source TEXT DEFAULT NULL;

-- Index for filtering/reporting by source
CREATE INDEX IF NOT EXISTS idx_agent_pipeline_updated_by_source
  ON agent_pipeline (updated_by_source);

COMMENT ON COLUMN agent_pipeline.updated_by_source IS 'Department that last changed this record: contracting_portal, training_hub, ghl_webhook, system';
