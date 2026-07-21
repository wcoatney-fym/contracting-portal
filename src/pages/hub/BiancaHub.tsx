import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Users, ChevronDown, Clock, CheckCircle2, Search, RefreshCw, Loader2, PenLine } from 'lucide-react';
import type { AgentPipelineStage } from '../../lib/supabase';

const HUB_PASSWORD = import.meta.env.VITE_BIANCA_HUB_PASSWORD ?? 'TrainingFYM!';

const STAGE_LABELS: Record<string, string> = {
  hip_broker: 'HIP Broker',
  hip_career: 'HIP Career',
  iaa: 'IAA',
  signed_iaa: 'Signed IAA',
  bill_com: 'Bill.com',
  crm: 'CRM',
  in_contracting: 'In Contracting (Carriers)',
  rts: 'RTS',
  hip_broker_ready: 'HIP Broker READY',
  hip_career_ready: 'HIP Career READY',
  actively_selling: 'Actively Selling',
  terminated: 'Terminated',
};

const STAGE_COLORS: Record<string, string> = {
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

type PipelineAgent = {
  id: string;
  agent_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  stage: AgentPipelineStage;
  last_updated_by: string;
  last_updated_by_display: string | null;
  stage_entered_at: string;
  updated_at: string;
};

type TrainingSummary = {
  agent_id: string;
  video_views: number;
  quiz_attempts: number;
  quiz_passes: number;
  live_clicks: number;
  last_event_at: string | null;
};

type StageEditState = {
  agentId: string;
  currentStage: AgentPipelineStage;
  pendingStage: AgentPipelineStage;
  updatedBy: string;
  saving: boolean;
};

const ALL_STAGES = Object.keys(STAGE_LABELS) as AgentPipelineStage[];

function timeAgo(dateStr: string): string {
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

export const BiancaHub: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [agents, setAgents] = useState<PipelineAgent[]>([]);
  const [training, setTraining] = useState<Record<string, TrainingSummary>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<AgentPipelineStage | ''>('');
  const [editState, setEditState] = useState<StageEditState | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: agentRows } = await supabase
      .from('agent_pipeline')
      .select('id, agent_name, first_name, last_name, email, phone, agency, stage, last_updated_by, last_updated_by_display, stage_entered_at, updated_at')
      .order('updated_at', { ascending: false });

    if (agentRows) setAgents(agentRows);

    // Pull training event summaries
    const { data: eventRows } = await supabase
      .from('agent_training_events')
      .select('agent_id, event_type, created_at');

    if (eventRows) {
      const summaryMap: Record<string, TrainingSummary> = {};
      for (const e of eventRows) {
        if (!summaryMap[e.agent_id]) {
          summaryMap[e.agent_id] = { agent_id: e.agent_id, video_views: 0, quiz_attempts: 0, quiz_passes: 0, live_clicks: 0, last_event_at: null };
        }
        const s = summaryMap[e.agent_id];
        if (e.event_type === 'video_view') s.video_views++;
        if (e.event_type === 'quiz_attempt') s.quiz_attempts++;
        if (e.event_type === 'quiz_pass') s.quiz_passes++;
        if (e.event_type === 'live_training_click') s.live_clicks++;
        if (!s.last_event_at || e.created_at > s.last_event_at) s.last_event_at = e.created_at;
      }
      setTraining(summaryMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === HUB_PASSWORD) {
      setAuthed(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const openStageEdit = (agent: PipelineAgent) => {
    setEditState({
      agentId: agent.id,
      currentStage: agent.stage,
      pendingStage: agent.stage,
      updatedBy: 'Bianca', // default for training-side moves
      saving: false,
    });
  };

  const confirmStageChange = async () => {
    if (!editState || editState.pendingStage === editState.currentStage) {
      setEditState(null);
      return;
    }

    setEditState(prev => prev ? { ...prev, saving: true } : null);

    const display = editState.updatedBy.trim() || 'Bianca';

    // Call the same push-pipeline-stage edge function used by the contracting board
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-pipeline-stage`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        record_id: editState.agentId,
        new_stage: editState.pendingStage,
        updated_by: display,
        updated_by_source: 'training_hub',
      }),
    });

    const result = await res.json();
    if (result.success) {
      setAgents(prev => prev.map(a =>
        a.id === editState.agentId
          ? { ...a, stage: editState.pendingStage, last_updated_by: display, last_updated_by_display: display, updated_at: new Date().toISOString() }
          : a
      ));
      showToast(`Stage updated to ${STAGE_LABELS[editState.pendingStage]}`, 'success');
    } else {
      showToast(result.error ?? 'Stage update failed', 'error');
    }

    setEditState(null);
  };

  const filtered = agents.filter(a => {
    const name = `${a.first_name ?? ''} ${a.last_name ?? ''} ${a.agent_name ?? ''}`.toLowerCase();
    const agency = (a.agency ?? '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || name.includes(q) || agency.includes(q);
    const matchesStage = !stageFilter || a.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-steel-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-navy-700" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Training Hub</h1>
            <p className="text-sm text-gray-500 mt-1">FYM Financial — Training Management</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-3 rounded-xl border text-sm ${passwordError ? 'border-red-400 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-navy-400`}
              autoFocus
            />
            {passwordError && <p className="text-xs text-red-500">Incorrect password.</p>}
            <button type="submit" className="w-full bg-navy-700 hover:bg-navy-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="min-h-screen bg-steel-50">
      {/* Header */}
      <div className="bg-navy-700 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-navy-200 text-xs mb-0.5">FYM Financial — Training Management</p>
            <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Agent Training Hub</h1>
          </div>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 text-navy-200 hover:text-white text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents or agencies..."
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

        {/* Agent cards */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-navy-400" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No agents match your search.</div>
            )}
            {filtered.map(agent => {
              const t = training[agent.id];
              const displayName = agent.first_name && agent.last_name
                ? `${agent.first_name} ${agent.last_name}`
                : agent.agent_name;
              const updatedBy = agent.last_updated_by_display || agent.last_updated_by;

              return (
                <div key={agent.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[agent.stage] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STAGE_LABELS[agent.stage] ?? agent.stage}
                        </span>
                      </div>
                      {agent.agency && <p className="text-xs text-gray-400 mt-0.5">{agent.agency}</p>}
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last updated by <span className="font-medium text-gray-600">{updatedBy}</span> · {timeAgo(agent.updated_at)}
                      </p>
                    </div>

                    <button
                      onClick={() => openStageEdit(agent)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-navy-600 hover:text-navy-800 border border-navy-200 hover:border-navy-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Move Stage
                    </button>
                  </div>

                  {/* Training summary row */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>📹 <span className="font-medium text-gray-700">{t?.video_views ?? 0}</span> video views</span>
                    <span>📝 <span className="font-medium text-gray-700">{t?.quiz_attempts ?? 0}</span> quiz attempts</span>
                    <span><CheckCircle2 className="w-3 h-3 inline text-emerald-500 mr-0.5" /><span className="font-medium text-gray-700">{t?.quiz_passes ?? 0}</span> passed</span>
                    <span>📡 <span className="font-medium text-gray-700">{t?.live_clicks ?? 0}</span> live sessions</span>
                    {t?.last_event_at && <span>Last active: <span className="font-medium text-gray-700">{timeAgo(t.last_event_at)}</span></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Move Agent Stage</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">New Stage</label>
                <div className="relative">
                  <select
                    value={editState.pendingStage}
                    onChange={e => setEditState(prev => prev ? { ...prev, pendingStage: e.target.value as AgentPipelineStage } : null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none"
                  >
                    {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Updated by</label>
                <input
                  type="text"
                  value={editState.updatedBy}
                  onChange={e => setEditState(prev => prev ? { ...prev, updatedBy: e.target.value } : null)}
                  placeholder="e.g. Bianca"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                />
                <p className="text-xs text-gray-400 mt-1">Defaults to Bianca. Change if someone else made this move.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditState(null)}
                disabled={editState.saving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStageChange}
                disabled={editState.saving || editState.pendingStage === editState.currentStage}
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {editState.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
};
