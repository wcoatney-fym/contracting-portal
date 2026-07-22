import type { AgentPipelineStage } from '../../lib/supabase';

export type StageChecklistItem = {
  key: AgentPipelineStage;
  label: string;
  subtitle: string;
  /** Step key agents can self-mark complete — stored in agent_pipeline.completed_steps */
  agentCompletable?: string;
  /** Label shown on the self-complete button */
  agentActionLabel?: string;
};

export const STAGE_CHECKLIST: StageChecklistItem[] = [
  { key: 'hip_broker',      label: 'Intake Form Submitted',       subtitle: 'Your intake form has been received by the contracting team.' },
  { key: 'iaa',             label: 'IAA',                         subtitle: 'Your Independent Agent Agreement has been sent. Review and sign it, then mark it complete below.',
    agentCompletable: 'iaa_signed_by_agent', agentActionLabel: 'I\'ve Signed My IAA' },
  { key: 'signed_iaa',      label: 'IAA Approved',                subtitle: 'Your signed IAA is being reviewed by the contracting team.' },
  { key: 'bill_com',        label: 'Bill.com Setup',              subtitle: 'Set up your Bill.com account so you can receive commissions. Once complete, mark it done below.',
    agentCompletable: 'bill_com_done_by_agent', agentActionLabel: 'I\'ve Set Up Bill.com' },
  { key: 'in_contracting',  label: 'In Contracting (Carriers)',   subtitle: 'Your carrier appointments are being processed.' },
  { key: 'rts',             label: 'Ready to Sell',               subtitle: 'Writing numbers verified — schedule your Test with Tyler to get cleared.' },
  { key: 'crm',             label: 'CRM Onboarding',              subtitle: 'Your CRM tools are being configured and you\'re almost ready to go!' },
];

export const TYLER_BOOKING_URL = '#'; // Replace with Tyler's Outlook Bookings URL

export function formatSessionTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso)) + ' CT';
}

export function stageIndex(stage: AgentPipelineStage | null): number {
  if (!stage) return -1;
  return STAGE_CHECKLIST.findIndex(s => s.key === stage);
}
