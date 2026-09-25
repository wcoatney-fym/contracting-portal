-- Allow authenticated inserts on pipeline_stage_history
--
-- Context: push-contracting-stage (FYM App edge function) writes a row to
-- pipeline_stage_history on every successful stage change. The function
-- connects to the Portal DB as an *authenticated* service account
-- (email/password sign-in via _shared/portal-db.ts — legacy JWT keys are
-- disabled on this project since the Sep 2026 rotation, so it cannot use
-- the service_role key path).
--
-- The table's only INSERT policy today is scoped to service_role, so every
-- insert from the edge function bounces off RLS and the audit trail stays
-- empty (0 rows since creation). This policy lets authenticated portal
-- sessions insert history rows. SELECT remains authenticated-only; anon
-- keeps zero access (no grants added here).
--
-- Approved by Charlie 2026-09-25 (Slack #dev-fym-app).

DROP POLICY IF EXISTS "Allow authenticated inserts on pipeline_stage_history"
  ON public.pipeline_stage_history;

CREATE POLICY "Allow authenticated inserts on pipeline_stage_history"
  ON public.pipeline_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
