import type { AgentPipelineStage } from '../../lib/supabase';

export const STAGE_CHECKLIST: {
  key: AgentPipelineStage;
  label: string;
  subtitle: string;
}[] = [
  { key: 'hip_broker',      label: 'Intake Form Submitted',       subtitle: 'Your intake form has been received by the contracting team.' },
  { key: 'iaa',             label: 'IAA Sent',                    subtitle: 'Your Independent Agent Agreement is on its way to you.' },
  { key: 'signed_iaa',      label: 'IAA Signed',                  subtitle: 'Sign and return your IAA to the contracting team.' },
  { key: 'bill_com',        label: 'Bill.com Setup',              subtitle: 'Set up your Bill.com account so you can receive commissions.' },
  { key: 'crm',             label: 'CRM Setup',                   subtitle: 'Your CRM tools are being configured.' },
  { key: 'in_contracting',  label: 'In Contracting (Carriers)',   subtitle: 'Your carrier appointments are being processed.' },
  { key: 'rts',             label: 'Ready to Sell',               subtitle: "You're fully appointed and cleared to write business!" },
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
