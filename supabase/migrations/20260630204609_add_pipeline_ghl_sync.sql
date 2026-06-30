/*
# Add Pipeline GHL Two-Way Sync Support

1. New Tables
  - `agent_pipeline_ghl_config` (single-row configuration for the contracting pipeline GHL connection)
    - `id` (uuid, primary key)
    - `ghl_api_key` (text) - API key for the contracting pipeline GHL sub-account
    - `ghl_location_id` (text) - GHL location/sub-account ID
    - `ghl_pipeline_id` (text) - specific GHL pipeline ID to target
    - `connection_status` (text) - disconnected/connected/error
    - `last_error` (text, nullable) - last connection error message
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

2. Modified Tables
  - `agent_pipeline`
    - Add `last_updated_by` (text, default 'ghl_webhook') - tracks origin of last stage change ('ghl_webhook' or 'ui')
    - Add `ghl_sync_status` (text, default 'synced') - tracks push state ('synced', 'pending_push', 'pushing')
  - `agent_pipeline_stage_map`
    - Add `ghl_stage_id` (text, nullable) - stores the GHL stage UUID for reverse mapping (push-back)

3. Security
  - RLS enabled on `agent_pipeline_ghl_config` with anon + authenticated full CRUD (single-tenant internal tool)

4. Important Notes
  - The `last_updated_by` + `ghl_sync_status` pair prevents infinite webhook loops
  - When UI changes a stage, it sets last_updated_by='ui' and ghl_sync_status='synced' after push
  - When inbound webhook sees same stage + last_updated_by='ui', it skips (echo detection)
  - `ghl_stage_id` on stage_map enables reverse mapping from internal stage to GHL stage UUID
*/

-- Config table for the contracting pipeline GHL connection (single-row)
CREATE TABLE IF NOT EXISTS agent_pipeline_ghl_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_api_key text NOT NULL DEFAULT '',
  ghl_location_id text NOT NULL DEFAULT '',
  ghl_pipeline_id text NOT NULL DEFAULT '',
  connection_status text NOT NULL DEFAULT 'disconnected',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_pipeline_ghl_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pipeline_ghl_config" ON agent_pipeline_ghl_config;
CREATE POLICY "anon_select_pipeline_ghl_config" ON agent_pipeline_ghl_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pipeline_ghl_config" ON agent_pipeline_ghl_config;
CREATE POLICY "anon_insert_pipeline_ghl_config" ON agent_pipeline_ghl_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pipeline_ghl_config" ON agent_pipeline_ghl_config;
CREATE POLICY "anon_update_pipeline_ghl_config" ON agent_pipeline_ghl_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pipeline_ghl_config" ON agent_pipeline_ghl_config;
CREATE POLICY "anon_delete_pipeline_ghl_config" ON agent_pipeline_ghl_config FOR DELETE
  TO anon, authenticated USING (true);

-- Add sync tracking columns to agent_pipeline
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline' AND column_name = 'last_updated_by') THEN
    ALTER TABLE agent_pipeline ADD COLUMN last_updated_by text NOT NULL DEFAULT 'ghl_webhook';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline' AND column_name = 'ghl_sync_status') THEN
    ALTER TABLE agent_pipeline ADD COLUMN ghl_sync_status text NOT NULL DEFAULT 'synced';
  END IF;
END $$;

-- Add ghl_stage_id to stage map for reverse mapping
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pipeline_stage_map' AND column_name = 'ghl_stage_id') THEN
    ALTER TABLE agent_pipeline_stage_map ADD COLUMN ghl_stage_id text;
  END IF;
END $$;
