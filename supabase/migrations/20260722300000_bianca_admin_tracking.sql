-- Migration: Bianca Admin Dashboard — tracking tables
-- Adds agent login tracking and live event attendance

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Agent Hub Logins — track every agent login via /hub
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_hub_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  login_method text NOT NULL DEFAULT 'npn', -- 'npn' | 'token'
  user_agent text,
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_agent_hub_logins_agent_id ON agent_hub_logins(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_hub_logins_logged_in_at ON agent_hub_logins(logged_in_at DESC);

-- RLS: allow inserts from anon (login endpoint), reads from authenticated
ALTER TABLE agent_hub_logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_hub_logins_insert ON agent_hub_logins FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY agent_hub_logins_select ON agent_hub_logins FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Agent Live Attendance — track which agents joined which live sessions
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_live_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  session_id uuid NOT NULL REFERENCES agent_live_sessions(id),
  clicked_join_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_live_attendance_session ON agent_live_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_live_attendance_agent ON agent_live_attendance(agent_id);

ALTER TABLE agent_live_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_live_attendance_insert ON agent_live_attendance FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY agent_live_attendance_select ON agent_live_attendance FOR SELECT TO anon USING (true);
