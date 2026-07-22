import React, { useState, useMemo } from 'react';
import {
  BookOpen, CheckCircle2, Video, FileText, Users, Trophy,
  TrendingUp, BarChart3, Filter,
} from 'lucide-react';
import type { ContentStat, AgentSummary } from './adminTypes';
import { pctColor, pctBg, agentDisplayName } from './adminHelpers';

interface Props {
  contentStats: ContentStat[];
  agents: AgentSummary[];
  totalContent: number;
}

const CARRIER_ORDER = ['All', 'UNL', 'GTL', 'AHL', 'Ameritas', 'General'] as const;

export const AdminTrainingTab: React.FC<Props> = ({ contentStats, agents, totalContent }) => {
  const [carrierFilter, setCarrierFilter] = useState<string>('All');

  // Available carriers from data
  const availableCarriers = useMemo(() => {
    const cs = new Set(contentStats.map(c => c.carrier ?? 'General'));
    return CARRIER_ORDER.filter(c => c === 'All' || cs.has(c));
  }, [contentStats]);

  // Filter content
  const filtered = useMemo(() => {
    if (carrierFilter === 'All') return contentStats;
    return contentStats.filter(c => (c.carrier ?? 'General') === carrierFilter);
  }, [contentStats, carrierFilter]);

  // Aggregate stats
  const totalViews = contentStats.reduce((s, c) => s + c.view_count, 0);
  const totalQuizAttempts = contentStats.reduce((s, c) => s + c.quiz_attempt_count, 0);
  const totalQuizPasses = contentStats.reduce((s, c) => s + c.quiz_pass_count, 0);
  const overallPassRate = totalQuizAttempts > 0 ? Math.round((totalQuizPasses / totalQuizAttempts) * 100) : null;

  // Agency training scores
  const agencyScores = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const a of agents) {
      const agency = a.agency ?? 'Unassigned';
      const existing = map.get(agency) ?? { total: 0, count: 0 };
      existing.total += a.training_pct;
      existing.count += 1;
      map.set(agency, existing);
    }
    return Array.from(map.entries())
      .map(([agency, { total, count }]) => ({ agency, avg: Math.round(total / count), count }))
      .sort((a, b) => b.avg - a.avg);
  }, [agents]);

  // Quiz leaderboard (top 10 by avg score, min 1 attempt)
  const quizLeaders = useMemo(() => {
    return agents
      .filter(a => a.quiz_attempts > 0)
      .sort((a, b) => (b.avg_quiz_score ?? 0) - (a.avg_quiz_score ?? 0))
      .slice(0, 10);
  }, [agents]);

  // Group filtered content by category
  const grouped = useMemo(() => {
    const map = new Map<string, ContentStat[]>();
    for (const c of filtered) {
      const cat = c.category ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">

      {/* ── Aggregate KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKpi icon={<BookOpen className="w-4 h-4 text-navy-600" />} label="Modules" value={totalContent} />
        <MiniKpi icon={<Video className="w-4 h-4 text-blue-500" />} label="Total Views" value={totalViews} />
        <MiniKpi icon={<FileText className="w-4 h-4 text-amber-500" />} label="Quiz Attempts" value={totalQuizAttempts} />
        <MiniKpi
          icon={<Trophy className="w-4 h-4 text-emerald-500" />}
          label="Pass Rate"
          value={overallPassRate !== null ? `${overallPassRate}%` : '—'}
          valueColor={overallPassRate !== null ? pctColor(overallPassRate) : undefined}
        />
      </div>

      {/* ── Carrier filter ─────────────────────────────────────────────── */}
      {availableCarriers.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableCarriers.map(c => (
            <button
              key={c}
              onClick={() => setCarrierFilter(c)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border
                ${carrierFilter === c
                  ? 'bg-navy-700 text-white border-navy-700 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Content Completion Heatmap ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-navy-600" />
            <h3 className="text-sm font-bold text-gray-900">Content Stats</h3>
          </div>

          {grouped.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No content data.</div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(c => {
                    const maxViews = Math.max(1, ...filtered.map(x => x.view_count));
                    const viewPct = (c.view_count / maxViews) * 100;
                    return (
                      <div key={c.content_id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-semibold text-gray-900 flex-1">{c.title}</p>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {c.view_count}</span>
                            {c.has_quiz && (
                              <>
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {c.quiz_attempt_count}</span>
                                <span className={`font-bold ${c.pass_rate !== null ? pctColor(c.pass_rate) : ''}`}>
                                  {c.pass_rate !== null ? `${c.pass_rate}%` : '—'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-navy-400 rounded-full" style={{ width: `${Math.max(viewPct, 3)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Quiz Leaderboard ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900">Quiz Leaderboard</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {quizLeaders.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">No quiz activity yet.</p>
            )}
            {quizLeaders.map((a, i) => (
              <div key={a.agent_id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                  {a.agency && <p className="text-[10px] text-gray-400 truncate">{a.agency}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${pctColor(a.avg_quiz_score ?? 0)}`}>{a.avg_quiz_score}%</p>
                  <p className="text-[10px] text-gray-400">{a.quiz_passes}/{a.quiz_attempts} passed</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agency Training Scores ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-gray-900">By Agency</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {agencyScores.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">No agency data.</p>
            )}
            {agencyScores.map(a => (
              <div key={a.agency} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.agency}</p>
                  <p className="text-[10px] text-gray-400">{a.count} agent{a.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctBg(a.avg)}`} style={{ width: `${Math.max(a.avg, 3)}%` }} />
                </div>
                <p className={`text-sm font-bold w-12 text-right ${pctColor(a.avg)}`}>{a.avg}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function MiniKpi({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string | number; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p></div>
      <p className={`text-xl font-extrabold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
