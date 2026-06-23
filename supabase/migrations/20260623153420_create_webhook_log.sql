
CREATE TABLE IF NOT EXISTS webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  outcome text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_webhook_log" ON webhook_log
  FOR SELECT TO anon USING (true);

CREATE POLICY "service_role_all_webhook_log" ON webhook_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_webhook_log_function_name ON webhook_log(function_name);
CREATE INDEX idx_webhook_log_created_at ON webhook_log(created_at DESC);
