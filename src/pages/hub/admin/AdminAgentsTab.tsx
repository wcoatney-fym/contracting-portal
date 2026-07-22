import React, { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, X, Users, BookOpen, Video,
  CheckCircle2, Clock, LogIn, Mail, Phone, Hash, ArrowUpDown,
  MapPin, FileText, Shield, Tag, Briefcase, User,
} from 'lucide-react';
import type { AgentSummary, TrainingEvent } from './adminTypes';
import {
  STAGE_LABELS, STAGE_COLORS, ALL_STAGES,
  timeAgo, agentDisplayName, pctColor, pctBg, formatDate,
} from './adminHelpers';
import type { AgentPipelineStage } from '../../../lib/supabase';
import { formatPhoneDisplay } from '../../../lib/supabase';

interface Props {
  agents: AgentSummary[];
  events: TrainingEvent[];
  totalContent: number;
}

type SortKey = 'name' | 'agency' | 'stage' | 'training_pct' | 'last_active' | 'login_count';
type SortDir = 'asc' | 'desc';

export const AdminAgentsTab: React.FC<Props> = ({ agents, events, totalContent }) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<AgentPipelineStage | ''>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'training_pct' || key === 'login_count' || key === 'last_active' ? 'desc' : 'asc'); }
  };

  const filtered = useMemo(() => {
    let list = agents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.agency ?? '').toLowerCase().includes(q) ||
        (a.npn ?? '').includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (stageFilter) list = list.filter(a => a.stage === stageFilter);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'agency': cmp = (a.agency ?? '').localeCompare(b.agency ?? ''); break;
        case 'stage': cmp = (STAGE_LABELS[a.stage ?? ''] ?? '').localeCompare(STAGE_LABELS[b.stage ?? ''] ?? ''); break;
        case 'training_pct': cmp = a.training_pct - b.training_pct; break;
        case 'login_count': cmp = a.login_count - b.login_count; break;
        case 'last_active': {
          const aT = Math.max(a.last_event_at ? new Date(a.last_event_at).getTime() : 0, a.last_login_at ? new Date(a.last_login_at).getTime() : 0);
          const bT = Math.max(b.last_event_at ? new Date(b.last_event_at).getTime() : 0, b.last_login_at ? new Date(b.last_login_at).getTime() : 0);
          cmp = aT - bT;
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [agents, search, stageFilter, sortKey, sortDir]);

  // Detail: get this agent's events
  const agentEvents = useMemo(() => {
    if (!selectedAgent) return [];
    return events
      .filter(e => e.agent_id === selectedAgent.agent_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [selectedAgent, events]);

  return (
    <div className="space-y-4">
      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, agency, NPN, tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value as AgentPipelineStage | '')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"
        >
          <option value="">All Stages</option>
          {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} agent{filtered.length !== 1 ? 's' : ''}</p>

      {/* ── Table (desktop) / Cards (mobile) ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[1fr_120px_130px_100px_80px_100px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <SortHeader label="Agent" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <SortHeader label="Agency" sortKey="agency" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <SortHeader label="Stage" sortKey="stage" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <SortHeader label="Training" sortKey="training_pct" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <SortHeader label="Logins" sortKey="login_count" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <SortHeader label="Last Active" sortKey="last_active" current={sortKey} dir={sortDir} onClick={toggleSort} />
        </div>

        <div className="divide-y divide-gray-50">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No agents match your filters.</div>
          )}
          {filtered.map(a => (
            <button
              key={a.agent_id}
              onClick={() => setSelectedAgent(a)}
              className="w-full text-left hover:bg-navy-50/30 transition-colors"
            >
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-[1fr_120px_130px_100px_80px_100px] gap-2 px-5 py-3.5 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 shrink-0">
                    {(a.name[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    <div className="flex items-center gap-1.5">
                      {a.npn && <p className="text-[11px] text-gray-400">NPN: {a.npn}</p>}
                      {a.tags.length > 0 && (
                        <div className="flex gap-1">
                          {a.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-navy-50 text-navy-600">{t}</span>
                          ))}
                          {a.tags.length > 2 && <span className="text-[9px] text-gray-400">+{a.tags.length - 2}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 truncate">{a.agency ?? '—'}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${STAGE_COLORS[a.stage ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STAGE_LABELS[a.stage ?? ''] ?? a.stage ?? '—'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pctBg(a.training_pct)}`} style={{ width: `${Math.max(a.training_pct, 3)}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${pctColor(a.training_pct)}`}>{a.training_pct}%</span>
                </div>
                <p className="text-xs text-gray-600 text-center">{a.login_count}</p>
                <p className="text-xs text-gray-500">
                  {(() => {
                    const t = Math.max(
                      a.last_event_at ? new Date(a.last_event_at).getTime() : 0,
                      a.last_login_at ? new Date(a.last_login_at).getTime() : 0,
                    );
                    return t ? timeAgo(new Date(t).toISOString()) : 'Never';
                  })()}
                </p>
              </div>

              {/* Mobile card */}
              <div className="lg:hidden px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 shrink-0">
                    {(a.name[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {a.agency && <p className="text-[11px] text-gray-400 truncate">{a.agency}</p>}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STAGE_COLORS[a.stage ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STAGE_LABELS[a.stage ?? ''] ?? '—'}
                      </span>
                      {a.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-navy-50 text-navy-600">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${pctColor(a.training_pct)}`}>{a.training_pct}%</p>
                    <p className="text-[10px] text-gray-400">{a.login_count} login{a.login_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent Detail Modal ────────────────────────────────────────────── */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedAgent.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {selectedAgent.agency && <span className="text-xs text-gray-500">{selectedAgent.agency}</span>}
                  {selectedAgent.npn && <span className="text-xs text-gray-400">NPN: {selectedAgent.npn}</span>}
                  {selectedAgent.form_type && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                      {selectedAgent.form_type.replace(/-/g, ' ')}
                    </span>
                  )}
                  {selectedAgent.crm_onboarded && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> CRM
                    </span>
                  )}
                  {selectedAgent.stage && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_COLORS[selectedAgent.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STAGE_LABELS[selectedAgent.stage] ?? selectedAgent.stage}
                    </span>
                  )}
                </div>
                {/* Tags */}
                {selectedAgent.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag className="w-3 h-3 text-gray-400" />
                    {selectedAgent.tags.map(t => (
                      <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-200">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Contact Info ──────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedAgent.email && (
                  <div>
                    <span className="text-gray-400 text-xs">Email</span>
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedAgent.email}</p>
                  </div>
                )}
                {selectedAgent.phone && (
                  <div>
                    <span className="text-gray-400 text-xs">Phone</span>
                    <p className="font-medium text-gray-900 text-sm">{formatPhoneDisplay(selectedAgent.phone)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Intake / Form Submission Data ─────────────────────────────── */}
            {selectedAgent.intake && (
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Intake Information
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  {selectedAgent.intake.agent_type && (
                    <InfoField label="Agent Type" value={selectedAgent.intake.agent_type} />
                  )}
                  {selectedAgent.intake.date_of_birth && (
                    <InfoField label="Date of Birth" value={selectedAgent.intake.date_of_birth} />
                  )}
                  {selectedAgent.intake.ssn && (
                    <InfoField label="SSN" value={maskSSN(selectedAgent.intake.ssn)} mono />
                  )}
                  {selectedAgent.intake.npn && (
                    <InfoField label="NPN" value={selectedAgent.intake.npn} />
                  )}
                  {selectedAgent.intake.resident_license_number && (
                    <InfoField label="Resident License #" value={selectedAgent.intake.resident_license_number} />
                  )}
                  {selectedAgent.intake.resident_state && (
                    <InfoField label="Resident State" value={selectedAgent.intake.resident_state} />
                  )}
                  {selectedAgent.intake.gender && (
                    <InfoField label="Gender" value={selectedAgent.intake.gender} />
                  )}
                  {selectedAgent.intake.release_needed && (
                    <InfoField label="Release Needed" value={selectedAgent.intake.release_needed} />
                  )}
                  {selectedAgent.intake.ctm_acknowledgment && (
                    <InfoField label="CTM Acknowledgment" value={selectedAgent.intake.ctm_acknowledgment} />
                  )}
                  {(selectedAgent.intake.address || selectedAgent.intake.city) && (
                    <div className="col-span-2">
                      <span className="text-gray-400 text-xs">Address</span>
                      <p className="font-medium text-gray-900 text-sm">
                        {[selectedAgent.intake.address, selectedAgent.intake.city, selectedAgent.intake.state, selectedAgent.intake.postal_code].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  {selectedAgent.intake.state_licenses && selectedAgent.intake.state_licenses.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-400 text-xs">State Licenses</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectedAgent.intake.state_licenses.map(sl => (
                          <span key={sl} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{sl}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Writing Numbers / LOB Assignments ────────────────────────── */}
            {selectedAgent.lob_assignments.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Writing Numbers
                </h4>
                <div className="space-y-2">
                  {selectedAgent.lob_assignments.map((lob, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{lob.carrier}</span>
                      <span className="text-sm font-mono font-medium text-gray-900">{lob.writing_number || '—'}</span>
                      <span className="text-xs text-gray-400 ml-auto">{lob.line_of_business}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Pipeline & Stage ─────────────────────────────────────────── */}
            {selectedAgent.stage && (
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Pipeline
                </h4>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[selectedAgent.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STAGE_LABELS[selectedAgent.stage] ?? selectedAgent.stage}
                  </span>
                  {selectedAgent.days_in_stage !== null && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" /> {selectedAgent.days_in_stage}d in stage
                    </span>
                  )}
                  {selectedAgent.last_login_at && (
                    <span className="text-xs text-gray-400 ml-auto">Last login: {timeAgo(selectedAgent.last_login_at)}</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Training Metrics ─────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Training Metrics
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat icon={<LogIn className="w-3.5 h-3.5 text-navy-600" />} label="Logins" value={selectedAgent.login_count} />
                <MiniStat icon={<Video className="w-3.5 h-3.5 text-blue-500" />} label="Videos" value={selectedAgent.video_views} />
                <MiniStat icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} label="Quizzes Passed" value={selectedAgent.quiz_passes} />
                <MiniStat icon={<BookOpen className="w-3.5 h-3.5 text-amber-500" />} label="Quiz Attempts" value={selectedAgent.quiz_attempts} />
                <MiniStat
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />}
                  label="Avg Score"
                  value={selectedAgent.avg_quiz_score !== null ? `${selectedAgent.avg_quiz_score}%` : '—'}
                />
                <MiniStat icon={<Video className="w-3.5 h-3.5 text-rose-500" />} label="Live Sessions" value={selectedAgent.live_clicks} />
              </div>

              {/* Training progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-500">Training Completion</p>
                  <p className={`text-xs font-bold ${pctColor(selectedAgent.training_pct)}`}>{selectedAgent.training_pct}%</p>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctBg(selectedAgent.training_pct)}`} style={{ width: `${Math.max(selectedAgent.training_pct, 3)}%` }} />
                </div>
              </div>
            </div>

            {/* ── Activity Timeline ────────────────────────────────────────── */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity Timeline</h4>
              {agentEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {agentEvents.slice(0, 30).map(e => (
                    <div key={e.id} className="flex items-start gap-3 py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-700">
                          {eventTypeLabel(e.event_type)}{e.content_title ? `: ${e.content_title}` : ''}
                          {e.quiz_score !== null && <span className={`ml-1 font-bold ${e.quiz_score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{e.quiz_score}%</span>}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(e.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helpers ──

function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-****';
  return `***-**-${digits.slice(-4)}`;
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className={`font-medium text-gray-900 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
      {label}
      {active ? (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
    </button>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'video_view': return 'Watched video';
    case 'quiz_attempt': return 'Quiz attempt';
    case 'quiz_pass': return 'Quiz passed';
    case 'live_training_click': return 'Joined live session';
    case 'tyler_schedule_click': return 'Schedule w/ Tyler';
    case 'step_self_complete': return 'Marked step complete';
    default: return type;
  }
}
