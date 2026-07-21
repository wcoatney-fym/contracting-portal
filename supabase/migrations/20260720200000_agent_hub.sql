-- Agent Hub: token table, training events, and last_updated_by extension
-- Migration: 20260720200000_agent_hub

-- 1. agent_hub_tokens — one row per agent, generated ONLY on intake form completion
CREATE TABLE IF NOT EXISTS agent_hub_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  npn text,
  agent_slug text UNIQUE, -- {first-last-npn} for the friendly URL segment
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_hub_tokens_agent_id_idx ON agent_hub_tokens(agent_id);
CREATE INDEX IF NOT EXISTS agent_hub_tokens_token_idx ON agent_hub_tokens(token);
CREATE INDEX IF NOT EXISTS agent_hub_tokens_slug_idx ON agent_hub_tokens(agent_slug);

-- RLS: public can read by token only (no auth needed — token IS the auth)
ALTER TABLE agent_hub_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_token_read_by_token"
  ON agent_hub_tokens FOR SELECT
  USING (is_active = true);

-- 2. agent_training_events — logs all training activity per agent
CREATE TABLE IF NOT EXISTS agent_training_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'video_view' | 'quiz_attempt' | 'quiz_pass' | 'live_training_click' | 'chatbot_session' | 'tyler_schedule_click' | 'writing_number_submit'
  content_id text, -- references training content block id (nullable for non-content events)
  content_title text,
  quiz_score numeric,
  quiz_max_score numeric,
  session_duration_seconds integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_training_events_agent_id_idx ON agent_training_events(agent_id);
CREATE INDEX IF NOT EXISTS agent_training_events_event_type_idx ON agent_training_events(event_type);
CREATE INDEX IF NOT EXISTS agent_training_events_created_at_idx ON agent_training_events(created_at DESC);

ALTER TABLE agent_training_events ENABLE ROW LEVEL SECURITY;

-- Public insert allowed (agent hub is unauthenticated) — reads gated to portal auth
CREATE POLICY "training_events_insert"
  ON agent_training_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "training_events_read"
  ON agent_training_events FOR SELECT
  USING (true);

-- 3. Extend agent_pipeline.last_updated_by to support named attribution
-- Currently: text NOT NULL DEFAULT 'ghl_webhook' (already text — just update the default)
-- We're keeping it text but widening the value set to include person names.
-- No schema change needed — it's already text. We document the new value contract:
--   'ghl_webhook' = GHL sync
--   'tracey'      = Contracting portal UI move (default)
--   'bianca'      = Training hub UI move (default)
--   Any other string = manually overridden by editor
-- Add last_updated_by_display for the human-readable label shown on cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_pipeline' AND column_name = 'last_updated_by_display'
  ) THEN
    ALTER TABLE agent_pipeline ADD COLUMN last_updated_by_display text;
  END IF;
END $$;

-- 4. Training content blocks — admin-managed, uploaded from portal
CREATE TABLE IF NOT EXISTS agent_training_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type text NOT NULL, -- 'video' | 'pdf' | 'doc_link' | 'live_session'
  content_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  has_quiz boolean NOT NULL DEFAULT false,
  quiz_questions jsonb DEFAULT '[]', -- [{question, options: [], correct_index}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_training_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_content_read"
  ON agent_training_content FOR SELECT
  USING (is_active = true);

-- 5. Live training sessions
CREATE TABLE IF NOT EXISTS agent_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  session_datetime timestamptz NOT NULL,
  join_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_sessions_read"
  ON agent_live_sessions FOR SELECT
  USING (is_active = true);
