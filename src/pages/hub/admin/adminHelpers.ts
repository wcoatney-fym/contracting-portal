import type { AgentPipelineStage } from '../../../lib/supabase';

export const STAGE_LABELS: Record<string, string> = {
  hip_broker: 'HIP Broker',
  hip_career: 'HIP Career',
  iaa: 'IAA',
  signed_iaa: 'Signed IAA',
  bill_com: 'Bill.com',
  crm: 'CRM',
  in_contracting: 'In Contracting',
  rts: 'RTS',
  hip_broker_ready: 'HIP Broker READY',
  hip_career_ready: 'HIP Career READY',
  actively_selling: 'Actively Selling',
  terminated: 'Terminated',
};

export const STAGE_COLORS: Record<string, string> = {
  hip_broker: 'bg-blue-100 text-blue-800',
  hip_career: 'bg-indigo-100 text-indigo-800',
  iaa: 'bg-violet-100 text-violet-800',
  signed_iaa: 'bg-purple-100 text-purple-800',
  bill_com: 'bg-fuchsia-100 text-fuchsia-800',
  crm: 'bg-cyan-100 text-cyan-800',
  in_contracting: 'bg-teal-100 text-teal-800',
  rts: 'bg-emerald-100 text-emerald-800',
  hip_broker_ready: 'bg-green-100 text-green-800',
  hip_career_ready: 'bg-lime-100 text-lime-800',
  actively_selling: 'bg-amber-100 text-amber-800',
  terminated: 'bg-red-100 text-red-800',
};

export const STAGE_DOT_COLORS: Record<string, string> = {
  hip_broker: 'bg-blue-500',
  hip_career: 'bg-indigo-500',
  iaa: 'bg-violet-500',
  signed_iaa: 'bg-purple-500',
  bill_com: 'bg-fuchsia-500',
  crm: 'bg-cyan-500',
  in_contracting: 'bg-teal-500',
  rts: 'bg-emerald-500',
  hip_broker_ready: 'bg-green-500',
  hip_career_ready: 'bg-lime-500',
  actively_selling: 'bg-amber-500',
  terminated: 'bg-red-500',
};

export const ALL_STAGES: AgentPipelineStage[] = [
  'hip_broker', 'hip_career', 'iaa', 'signed_iaa', 'bill_com',
  'crm', 'in_contracting', 'rts', 'hip_broker_ready',
  'hip_career_ready', 'actively_selling', 'terminated',
];

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function daysBetween(a: string, b?: string): number {
  const end = b ? new Date(b).getTime() : Date.now();
  return Math.floor((end - new Date(a).getTime()) / 86400000);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso)) + ' CT';
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function pctColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-700';
  if (pct >= 50) return 'text-amber-700';
  return 'text-red-600';
}

export function pctBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function agentDisplayName(first: string | null, last: string | null, fallback?: string): string {
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return fallback ?? 'Unknown';
}
