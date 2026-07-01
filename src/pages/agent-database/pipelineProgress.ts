import type { AgentPipelineRecord, AgentPipelineStageStep } from '../../lib/supabase';

export type StageHealth = 'fresh' | 'aging' | 'stalled';

// Days an agent can sit in a stage before the card warms up / goes red.
const AGING_DAYS = 7;
const STALLED_DAYS = 14;

export function daysInStage(record: AgentPipelineRecord): number {
  const diff = Date.now() - new Date(record.stage_entered_at).getTime();
  return Math.floor(diff / 86_400_000);
}

export function stageHealth(record: AgentPipelineRecord): StageHealth {
  const d = daysInStage(record);
  if (d >= STALLED_DAYS) return 'stalled';
  if (d >= AGING_DAYS) return 'aging';
  return 'fresh';
}

export interface StepProgress {
  steps: AgentPipelineStageStep[];
  completedCount: number;
  total: number;
  fraction: number; // 0..1
  allComplete: boolean;
  nextStep: AgentPipelineStageStep | null;
}

export function computeProgress(
  record: AgentPipelineRecord,
  allSteps: AgentPipelineStageStep[],
): StepProgress {
  const steps = allSteps
    .filter(s => s.internal_stage === record.stage && s.active)
    .sort((a, b) => a.display_order - b.display_order);

  const completed = record.completed_steps || {};
  const completedCount = steps.filter(s => completed[s.id]).length;
  const total = steps.length;
  const nextStep = steps.find(s => !completed[s.id]) || null;

  return {
    steps,
    completedCount,
    total,
    fraction: total > 0 ? completedCount / total : 0,
    allComplete: total > 0 && completedCount === total,
    nextStep,
  };
}
