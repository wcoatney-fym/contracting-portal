import React, { useMemo } from 'react';
import {
  Users, BookOpen, Trophy, TrendingUp, AlertTriangle,
  Clock, CheckCircle2, Video, FileText, LogIn,
} from 'lucide-react';
import type { AgentSummary, TrainingEvent } from './adminTypes';
import { STAGE_LABELS, STAGE_DOT_COLORS, timeAgo, agentDisplayName, pctColor } from './adminHelpers';

interface Props {
  agents: AgentSummary[];
  recentEvents: TrainingEvent[];
  agentNames: Map<string, string>;
  totalContent: number;
  onSwitchTab: (tab: 'agents' | 'training' | 'pipeline' | 'live') => void;
}

export const AdminDashboardTab: React.FC<Props> = ({
  agents, recentEvents, agentNames, totalContent, onSwitchTab,
}) => {
  // ── KPIs ──
  const totalAgents = agents.length;
  const activeInTraining = agents.filter(a => a.video_views > 0 || a.quiz_attempts > 0 || a.live_clicks > 0).length;
  const avgQuiz = useMemo(() => {
    const scored = agents.filter(a => a.avg_quiz_score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, a) => s + (a.avg_quiz_score ?? 0), 0) / scored.length);
  }, [agents]);
  const avgTrainingPct = useMemo(() => {
    if (!agents.length) return 0;
    return Math.round(agents.reduce((s, a) => s + a.training_pct, 0) / agents.length);
  }, [agents]);

  // ── Agents needing attention ──
  const needsAttention = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 86400000;
    return agents
      .filter(a => {
        // No activity in 7+ days
        const lastAct = a.last_event_at ? new Date(a.last_event_at).getTime() : 0;
        const lastLog = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const latest = Math.max(lastAct, lastLog);
        if (!latest || now - latest > sevenDays) return true;
        // Failed quizzes (attempts but no passes)
        if (a.quiz_attempts > 0 && a.quiz_passes === 0) return true;
        // Stalled in stage > 14 days (non-terminal)
        if (a.days_in_stage !== null && a.days_in_stage > 14 && a.stage !== 'actively_selling' && a.stage !== 'terminated' && a.stage !== 'rts') return true;
        return false;
      })
      .sort((a, b) => {
        // Sort by most stale first
        const aLast = Math.max(
          a.last_event_at ? new Date(a.last_event_at).getTime() : 0,
          a.last_login_at ? new Date(a.last_login_at).getTime() : 0,
        );
        const bLast = Math.max(
          b.last_event_at ? new Date(b.last_event_at).getTime() : 0,
          b.last_login_at ? new Date(b.last_login_at).getTime() : 0,
        );
        return aLast - bLast;
      })
      .slice(0, 8);
  }, [agents]);

  // ── Stage breakdown ──
  const stageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of agents) {
      if (!a.stage) continue;
      map.set(a.stage, (map.get(a.stage) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [agents]);
  const maxStageCount = Math.max(1, ...stageCounts.map(([, c]) => c));

  return (
    <div className="space-y-6">

      {/* ── Hero KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5 text-navy-600" />}
          label="Total Agents"
          value={totalAgents}
          onClick={() => onSwitchTab('agents')}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="Active in Training"
          value={activeInTraining}
          sub={totalAgents > 0 ? `${Math.round((activeInTraining / totalAgents) * 100)}% of roster` : undefined}
          onClick={() => onSwitchTab('training')}
        />
        <KpiCard
          icon={<Trophy className="w-5 h-5 text-amber-600" />}
          label="Avg Quiz Score"
          value={avgQuiz !== null ? `${avgQuiz}%` : '—'}
          valueColor={avgQuiz !== null ? pctColor(avgQuiz) : undefined}
        />
        <KpiCard
          icon={<BookOpen className="w-5 h-5 text-violet-600" />}
          label="Training Completion"
          value={`${avgTrainingPct}%`}
          sub={`${totalContent} modules`}
          valueColor={pctColor(avgTrainingPct)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Pipeline Breakdown ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Pipeline Breakdown</h3>
            <button onClick={() => onSwitchTab('pipeline')} className="text-xs font-semibold text-navy-600 hover:text-navy-800">View all →</button>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {stageCounts.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No pipeline data yet.</p>}
            {stageCounts.map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT_COLORS[stage] ?? 'bg-gray-400'}`} />
                <span className="text-xs text-gray-600 w-28 truncate">{STAGE_LABELS[stage] ?? stage}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAGE_DOT_COLORS[stage] ?? 'bg-gray-400'}`}
                    style={{ width: `${Math.max((count / maxStageCount) * 100, 6)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {recentEvents.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">No activity yet.</p>
            )}
            {recentEvents.slice(0, 12).map(e => {
              const name = agentNames.get(e.agent_id) ?? 'Unknown';
              return (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <EventIcon type={e.event_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">{name}</span>{' '}
                      {eventLabel(e)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(e.created_at)}</p>
                  </div>
                  {e.quiz_score !== null && (
                    <span className={`text-xs font-bold ${e.quiz_score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {e.quiz_score}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Needs Attention ───────────────────────────────────────────────── */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900">Needs Attention</h3>
            <span className="ml-auto text-xs text-amber-600 font-semibold">{needsAttention.length} agent{needsAttention.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {needsAttention.map(a => {
              const reasons: string[] = [];
              const now = Date.now();
              const sevenDays = 7 * 86400000;
              const lastAct = a.last_event_at ? new Date(a.last_event_at).getTime() : 0;
              const lastLog = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
              const latest = Math.max(lastAct, lastLog);
              if (!latest) reasons.push('Never logged in');
              else if (now - latest > sevenDays) reasons.push(`Inactive ${Math.floor((now - latest) / 86400000)}d`);
              if (a.quiz_attempts > 0 && a.quiz_passes === 0) reasons.push('Failed quizzes');
              if (a.days_in_stage !== null && a.days_in_stage > 14 && a.stage !== 'actively_selling' && a.stage !== 'terminated' && a.stage !== 'rts') {
                reasons.push(`${a.days_in_stage}d in ${STAGE_LABELS[a.stage ?? ''] ?? a.stage}`);
              }

              return (
                <div key={a.agent_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                    {(a.name[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    {a.agency && <p className="text-[11px] text-gray-400 truncate">{a.agency}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {reasons.map((r, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">{r}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

function KpiCard({ icon, label, value, sub, valueColor, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left ${onClick ? 'hover:border-navy-200 transition-colors cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">{icon}</div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-extrabold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Tag>
  );
}

function EventIcon({ type }: { type: string }) {
  const base = 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0';
  switch (type) {
    case 'video_view':
      return <div className={`${base} bg-blue-50`}><Video className="w-3.5 h-3.5 text-blue-500" /></div>;
    case 'quiz_attempt':
      return <div className={`${base} bg-amber-50`}><FileText className="w-3.5 h-3.5 text-amber-500" /></div>;
    case 'quiz_pass':
      return <div className={`${base} bg-emerald-50`}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>;
    case 'live_training_click':
      return <div className={`${base} bg-violet-50`}><Video className="w-3.5 h-3.5 text-violet-500" /></div>;
    case 'tyler_schedule_click':
      return <div className={`${base} bg-rose-50`}><Clock className="w-3.5 h-3.5 text-rose-500" /></div>;
    default:
      return <div className={`${base} bg-gray-50`}><LogIn className="w-3.5 h-3.5 text-gray-400" /></div>;
  }
}

function eventLabel(e: TrainingEvent): string {
  switch (e.event_type) {
    case 'video_view': return `watched ${e.content_title ?? 'a training video'}`;
    case 'quiz_attempt': return `attempted quiz: ${e.content_title ?? 'unknown'}`;
    case 'quiz_pass': return `passed quiz: ${e.content_title ?? 'unknown'}`;
    case 'live_training_click': return `joined live session: ${e.content_title ?? 'unknown'}`;
    case 'tyler_schedule_click': return 'clicked Schedule w/ Tyler';
    default: return e.event_type;
  }
}
