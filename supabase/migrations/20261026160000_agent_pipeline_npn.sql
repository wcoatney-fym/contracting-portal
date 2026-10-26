-- DBC backfill support: persist a resolved NPN on the pipeline card itself.
-- When the push-pipeline-stage DBC hook resolves an NPN via the CRM roster
-- fallback, it writes the value back here so the card carries its own NPN
-- (Charlie, 2026-10-26, #dev-fym-app thread 1792679629.945749).
-- Additive only. No grants change: agent_pipeline's existing RLS applies.
alter table agent_pipeline add column if not exists npn text;

comment on column agent_pipeline.npn is
  'Agent NPN attributed to this pipeline card. Written back by the DBC lifecycle hook when resolved via agents/agent_intake/CRM-roster lookup; may also be set manually.';
