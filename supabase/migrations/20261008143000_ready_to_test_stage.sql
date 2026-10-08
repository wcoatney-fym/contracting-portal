/*
  # Ready to Test pipeline stage (Charlie, 2026-10-08)

  New internal stage `ready_to_test` between waiting_for_numbers and rts.
  - Entry: agent reports their first writing number.
  - The "Test out" step (now scheduled with Bianca) happens here.
  - `rts` now means "passed the test, holding until first policy."
  GHL stage name is exactly "Ready to Test" (Charlie). The GHL stage ID is
  auto-learned by contracting-pipeline-webhook from the first inbound webhook
  carrying that stage name.

  Changes (all additive / reversible):
  1. agent_pipeline.valid_pipeline_stage check — add 'ready_to_test'.
  2. agent_pipeline_stage_map.valid_internal_stage check — add 'ready_to_test'.
  3. Stage map row: 'Ready to Test' → ready_to_test (ghl_stage_id learned later).
  4. Re-home checklist steps to ready_to_test:
     - 391d1c03 "Agent parked after reporting carrier codes" (admin-only)
     - bb52e2aa "Test out with Tyler" (agent-visible; UI copy now says Bianca)
     EnrollHere steps (Tracey request + confirmed) stay at rts per Charlie.

  NOTE: the one-time backfill (agents sitting at rts without an approved
  test-out) runs as a separate post-deploy script AFTER the GHL stage exists
  and its ID has been learned, so the outbox can push the moves to GHL.
*/

-- 1. agent_pipeline stage check constraint
ALTER TABLE agent_pipeline DROP CONSTRAINT valid_pipeline_stage;
ALTER TABLE agent_pipeline ADD CONSTRAINT valid_pipeline_stage CHECK (
  stage = ANY (ARRAY[
    'hip_broker'::text, 'hip_career'::text, 'iaa'::text, 'signed_iaa'::text,
    'bill_com'::text, 'crm'::text, 'in_contracting'::text,
    'waiting_for_numbers'::text, 'ready_to_test'::text, 'rts'::text,
    'hip_broker_ready'::text, 'hip_career_ready'::text,
    'actively_selling'::text, 'terminated'::text, 'dnf'::text,
    'reactivated'::text
  ])
);

-- 2. agent_pipeline_stage_map internal stage check constraint
ALTER TABLE agent_pipeline_stage_map DROP CONSTRAINT valid_internal_stage;
ALTER TABLE agent_pipeline_stage_map ADD CONSTRAINT valid_internal_stage CHECK (
  internal_stage = ANY (ARRAY[
    'hip_broker'::text, 'hip_career'::text, 'iaa'::text, 'signed_iaa'::text,
    'bill_com'::text, 'crm'::text, 'in_contracting'::text,
    'waiting_for_numbers'::text, 'ready_to_test'::text, 'rts'::text,
    'hip_broker_ready'::text, 'hip_career_ready'::text,
    'actively_selling'::text, 'terminated'::text, 'dnf'::text,
    'reactivated'::text
  ])
);

-- 3. Stage map row — name must match the GHL stage exactly ("Ready to Test").
--    ghl_stage_id stays NULL until auto-learned from the first webhook.
INSERT INTO agent_pipeline_stage_map (ghl_stage_name, internal_stage, display_order)
VALUES ('Ready to Test', 'ready_to_test', 8)
ON CONFLICT (ghl_stage_name) DO NOTHING;

-- 4. Re-home the test-out checklist steps to the new stage
UPDATE agent_pipeline_stage_steps
SET internal_stage = 'ready_to_test'
WHERE id IN (
  '391d1c03-fbbe-45fb-929a-5b0ddae86b6a', -- Agent parked after reporting carrier codes
  'bb52e2aa-7ffd-465f-96e9-fbd4af305c7d'  -- Test out (with Bianca)
);
