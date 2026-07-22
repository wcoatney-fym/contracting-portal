import React, { useState, useMemo } from 'react';
import {
  PenLine, ChevronDown, Clock, Loader2, Search, Users,
} from 'lucide-react';
import type { PipelineAgent } from './adminTypes';
import type { AgentPipelineStage } from '../../../lib/supabase';
import {
  STAGE_LABELS, STAGE_COLORS, STAGE_DOT_COLORS, ALL_STAGES,
  timeAgo, daysBetween, agentDisplayName,
} from './adminHelpers';

interface Props {
  pipeline: PipelineAgent[];
  onStageChange: (agentId: string, newStage: AgentPipelineStage, updatedBy: string) => Promise<boolean>;
}

type ViewMode = 'kanban' | 'list';

type StageEditState = {
  agentId: string;
  currentStage: AgentPipelineStage;
  pendingStage: AgentPipelineStage;
  updatedBy: string;
  saving: boolean;
};

export const AdminPipelineTab: React.FC<Props> = ({ pipeline, onStageChange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [editState, setEditState] = useState<StageEditState | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => {
    if (!search) return pipeline;
    const q = search.toLowerCase();
    return pipeline.filter(a => {
      const name = `${a.first_name ?? ''} ${a.last_name ?? ''} ${a.agent_name ?? ''}`.toLowerCase();
      return name.includes(q) || (a.agency ?? '').toLowerCase().includes(q);
    });
  }, [pipeline, search]);

  // Group by stage for kanban
  const stageGroups = useMemo(() => {
    const map = new Map<AgentPipelineStage, PipelineAgent[]>();
    for (const s of ALL_STAGES) map.set(s, []);
    for (const a of filtered) {
      const list = map.get(a.stage);
      if (list) list.push(a);
    }
    // Only return stages that have agents or are key milestones
    const keyStages = new Set<AgentPipelineStage>(['hip_broker', 'hip_career', 'iaa', 'in_contracting', 'rts', 'actively_selling']);
    return Array.from(map.entries()).filter(([s, agents]) => agents.length > 0 || keyStages.has(s));
  }, [filtered]);

  const openEdit = (agent: PipelineAgent) => {
    setEditState({
      agentId: agent.id,
      currentStage: agent.stage,
      pendingStage: agent.stage,
      updatedBy: 'Bianca',
      saving: false,
    });
  };

  const confirmChange = async () => {
    if (!editState || editState.pendingStage === editState.currentStage) {
      setEditState(null);
      return;
    }
    setEditState(prev => prev ? { ...prev, saving: true } : null);
    const ok = await onStageChange(editState.agentId, editState.pendingStage, editState.updatedBy.trim() || 'Bianca');
    if (ok) showToast(`Stage updated to ${STAGE_LABELS[editState.pendingStage]}`, 'success');
    else showToast('Stage update failed', 'error');
    setEditState(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search agents..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Board</button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>List</button>
        </div>
      </div>

      {/* ── Kanban View ──────────────────────────────────────────────────── */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {stageGroups.map(([stage, agents]) => {
            const daysInStage = agents.map(a => daysBetween(a.stage_entered_at));
            const avgDays = daysInStage.length > 0 ? Math.round(daysInStage.reduce((s, d) => s + d, 0) / daysInStage.length) : 0;

            return (
              <div key={stage} className="min-w-[260px] max-w-[300px] shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT_COLORS[stage] ?? 'bg-gray-400'}`} />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{STAGE_LABELS[stage] ?? stage}</h4>
                  <span className="ml-auto text-xs font-bold text-gray-400">{agents.length}</span>
                </div>
                {avgDays > 0 && (
                  <p className="text-[10px] text-gray-400 mb-2 px-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Avg {avgDays}d in stage
                  </p>
                )}
                <div className="space-y-2">
                  {agents.length === 0 && (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Empty</div>
                  )}
                  {agents.map(a => {
                    const displayName = a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.agent_name;
                    const days = daysBetween(a.stage_entered_at);
                    const stale = days > 14 && stage !== 'actively_selling' && stage !== 'terminated' && stage !== 'rts';

                    return (
                      <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-3.5 ${stale ? 'border-amber-200' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                            {a.agency && <p className="text-[11px] text-gray-400 truncate">{a.agency}</p>}
                          </div>
                          <button onClick={() => openEdit(a)} className="shrink-0 text-gray-400 hover:text-navy-600 p-1 transition-colors">
                            <PenLine className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className={stale ? 'text-amber-600 font-medium' : ''}>{days}d</span>
                          <span className="ml-auto">by {a.last_updated_by_display || a.last_updated_by}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ─────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">No agents match.</div>
            )}
            {filtered.map(a => {
              const displayName = a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.agent_name;
              const days = daysBetween(a.stage_entered_at);
              const stale = days > 14 && a.stage !== 'actively_selling' && a.stage !== 'terminated' && a.stage !== 'rts';

              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT_COLORS[a.stage] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    {a.agency && <p className="text-[10px] text-gray-400">{a.agency}</p>}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_COLORS[a.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STAGE_LABELS[a.stage] ?? a.stage}
                  </span>
                  <span className={`text-xs ${stale ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{days}d</span>
                  <button onClick={() => openEdit(a)} className="shrink-0 text-gray-400 hover:text-navy-600 p-1">
                    <PenLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stage Edit Modal ──────────────────────────────────────────── */}
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
                  type="text" value={editState.updatedBy}
                  onChange={e => setEditState(prev => prev ? { ...prev, updatedBy: e.target.value } : null)}
                  placeholder="e.g. Bianca"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditState(null)} disabled={editState.saving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmChange} disabled={editState.saving || editState.pendingStage === editState.currentStage}
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40 flex items-center justify-center gap-2">
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
