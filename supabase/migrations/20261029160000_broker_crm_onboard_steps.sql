-- Broker CRM onboarding steps (Charlie, #dev-fym-app thread 1793285346, 2026-10-29)
--
-- Spec:
--   * Broker = agents.form_type = 'hip-broker'. Everyone else is "career" for this feature.
--   * Brokers get an "Onboard to CRM" step in EVERY working stage (not terminated/dnf),
--     skippable at each. Skip = visual-only completion (sentinel in completed_steps),
--     no automation, no CRM Roster seat, reversible.
--   * When actually checked (broker pays), the same crm-onboard-automation flow fires
--     as for career agents, from any stage.
--   * Career agents see ZERO change: their existing single "Onboard to CRM" step in
--     in_contracting stays exactly as-is (skippable=false), now tagged career_only.
--
-- Mechanism:
--   * step_key: stable semantic key; 'crm_onboard' marks any step (career or broker row)
--     whose check fires crm-onboard-automation. Replaces the UI's hardcoded step UUID
--     (kept as fallback).
--   * broker_visibility: 'all' | 'career_only' | 'broker_only' — UI renders a step for a
--     pipeline record based on whether the agent is a hip-broker.
--
-- UI counterpart: FYM-App feat/broker-crm-step (renders broker rows, fans completion
-- state out across all crm_onboard step ids so the checkbox state follows the card
-- between stages). UI is backward/forward compatible: missing columns = old behavior.

ALTER TABLE agent_pipeline_stage_steps
  ADD COLUMN IF NOT EXISTS step_key text,
  ADD COLUMN IF NOT EXISTS broker_visibility text NOT NULL DEFAULT 'all';

ALTER TABLE agent_pipeline_stage_steps
  DROP CONSTRAINT IF EXISTS agent_pipeline_stage_steps_broker_visibility_check;
ALTER TABLE agent_pipeline_stage_steps
  ADD CONSTRAINT agent_pipeline_stage_steps_broker_visibility_check
  CHECK (broker_visibility IN ('all', 'career_only', 'broker_only'));

-- Existing career "Onboard to CRM" step (in_contracting): tag it, scope it to career.
-- No other attribute changes — career flow untouched.
UPDATE agent_pipeline_stage_steps
SET step_key = 'crm_onboard',
    broker_visibility = 'career_only'
WHERE id = '3a88c474-9631-4c09-a774-4ae808d9825c';

-- Broker-only "Onboard to CRM" step in every working stage.
-- Excluded: terminated, dnf (per spec); hip_career, actively_selling_career
-- (career-track stages a hip-broker record never occupies).
-- Idempotent: skips stages that already have a broker crm_onboard row.
INSERT INTO agent_pipeline_stage_steps
  (internal_stage, label, display_order, active, agent_visible,
   skippable, skip_requires_true_completion, step_key, broker_visibility)
SELECT s.stage,
       'Onboard to CRM',
       COALESCE((SELECT max(e.display_order)
                 FROM agent_pipeline_stage_steps e
                 WHERE e.internal_stage = s.stage), 0) + 1,
       true,   -- active
       false,  -- agent_visible: internal/Bianca-facing only, never shown in Agent Hub
       true,   -- skippable
       false,  -- skip available immediately, no true-completion gate
       'crm_onboard',
       'broker_only'
FROM (VALUES
        ('hip_broker'),
        ('iaa'),
        ('in_contracting'),
        ('waiting_for_numbers'),
        ('ready_to_test'),
        ('rts'),
        ('actively_selling_broker'),
        ('reactivated')
     ) AS s(stage)
WHERE NOT EXISTS (
  SELECT 1 FROM agent_pipeline_stage_steps e
  WHERE e.internal_stage = s.stage
    AND e.step_key = 'crm_onboard'
    AND e.broker_visibility = 'broker_only'
);
