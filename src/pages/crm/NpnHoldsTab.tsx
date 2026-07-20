/**
 * @crm-team-protected
 *
 * NPN Holds tab — surfaces policies stuck in the NPN gate (npn_holds WHERE status='held')
 * and proposed fires awaiting approval (proposed_fires WHERE approved_at IS NULL).
 *
 * Data source: Sales Tracker DB (lryxxn) via admin-api actions:
 *   - get-npn-holds    → loads both tables
 *   - approve-proposed-fire → sets approved_at; daily cron picks up at 7:15 AM CT
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL ?? '';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? '';

type NpnHold = {
  id: number;
  policy_nbr: string;
  trigger_type: string;
  changed_on: string;
  agency_name: string | null;
  agent_name: string | null;
  writing_number: string;
  held_at: string;
  status: 'held' | 'resolved';
};

type ProposedFire = {
  id: number;
  npn_hold_id: number;
  policy_nbr: string;
  trigger_type: string;
  changed_on: string;
  agent_npn: string;
  writing_number: string;
  proposed_at: string;
  approved_at: string | null;
  fired_at: string | null;
  approved_by: string | null;
};

type TabView = 'held' | 'proposed';

const TRIGGER_COLORS: Record<string, string> = {
  approved:   'bg-emerald-50 text-emerald-700',
  terminated: 'bg-rose-50 text-rose-700',
  at_risk:    'bg-amber-50 text-amber-700',
  submission: 'bg-blue-50 text-blue-700',
};

function triggerBadge(type: string) {
  const cls = TRIGGER_COLORS[type] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'America/Chicago',
  }) + ' CT';
}

async function callAdminApi(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
    },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error(`admin-api ${action} returned ${res.status}`);
  return res.json();
}

export const NpnHoldsTab: React.FC = () => {
  const [holds, setHolds]         = useState<NpnHold[]>([]);
  const [proposed, setProposed]   = useState<ProposedFire[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('held');
  const [search, setSearch]       = useState('');
  const [approving, setApproving] = useState<Set<number>>(new Set());
  const [approved, setApproved]   = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<'held_at' | 'changed_on'>('held_at');
  const [sortAsc, setSortAsc]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callAdminApi('get-npn-holds');
      setHolds(data.holds ?? []);
      setProposed(data.proposed ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load NPN holds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (pf: ProposedFire) => {
    setApproving(prev => new Set(prev).add(pf.id));
    try {
      await callAdminApi('approve-proposed-fire', {
        proposed_fire_id: pf.id,
        approved_by: 'crm-admin',
      });
      setApproved(prev => new Set(prev).add(pf.id));
    } catch (e) {
      alert(`Approval failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setApproving(prev => { const s = new Set(prev); s.delete(pf.id); return s; });
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : null;

  const q = search.toLowerCase();

  const filteredHolds = holds
    .filter(h =>
      !q ||
      h.policy_nbr.toLowerCase().includes(q) ||
      (h.agency_name ?? '').toLowerCase().includes(q) ||
      (h.agent_name ?? '').toLowerCase().includes(q) ||
      h.writing_number.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const av = sortField === 'held_at' ? a.held_at : a.changed_on;
      const bv = sortField === 'held_at' ? b.held_at : b.changed_on;
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const filteredProposed = proposed
    .filter(p =>
      !approved.has(p.id) && (
        !q ||
        p.policy_nbr.toLowerCase().includes(q) ||
        p.writing_number.toLowerCase().includes(q) ||
        p.agent_npn.toLowerCase().includes(q)
      )
    )
    .sort((a, b) => sortAsc
      ? a.proposed_at.localeCompare(b.proposed_at)
      : b.proposed_at.localeCompare(a.proposed_at)
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">NPN Holds</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Policies blocked at the NPN gate — agent writing number couldn't be matched to an NPN.
            Resolved holds flow into <span className="font-medium">Proposed Fires</span> awaiting your approval.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">{holds.length} held</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {proposed.filter(p => !approved.has(p.id)).length} awaiting approval
          </span>
        </div>
        <div className="text-xs text-gray-400 self-center ml-1">
          Push fires daily at 7:15 AM CT after approval
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['held', 'proposed'] as TabView[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                activeTab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'held' ? `Held (${holds.length})` : `Proposed (${proposed.filter(p => !approved.has(p.id)).length})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search policy, agent, agency…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : activeTab === 'held' ? (
        /* ── Held table ── */
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Policy #</th>
                <th className="px-4 py-3 text-left">Trigger</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('changed_on')}
                >
                  Changed On <SortIcon field="changed_on" />
                </th>
                <th className="px-4 py-3 text-left">Agency</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Writing #</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('held_at')}
                >
                  Held Since <SortIcon field="held_at" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHolds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search ? 'No holds match your search.' : 'No held policies — NPN gate is clear.'}
                  </td>
                </tr>
              ) : filteredHolds.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{h.policy_nbr}</td>
                  <td className="px-4 py-3">{triggerBadge(h.trigger_type)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(h.changed_on)}</td>
                  <td className="px-4 py-3 text-gray-700">{h.agency_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{h.agent_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{h.writing_number}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(h.held_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Proposed fires table ── */
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Policy #</th>
                <th className="px-4 py-3 text-left">Trigger</th>
                <th className="px-4 py-3 text-left">Changed On</th>
                <th className="px-4 py-3 text-left">Agent NPN</th>
                <th className="px-4 py-3 text-left">Writing #</th>
                <th className="px-4 py-3 text-left">Proposed At</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProposed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {search ? 'No proposed fires match your search.' : 'No proposed fires pending approval.'}
                  </td>
                </tr>
              ) : filteredProposed.map(p => {
                const isApproving = approving.has(p.id);
                const isApproved  = approved.has(p.id);
                return (
                  <tr key={p.id} className={`transition-colors ${isApproved ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.policy_nbr}</td>
                    <td className="px-4 py-3">{triggerBadge(p.trigger_type)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(p.changed_on)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.agent_npn}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.writing_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(p.proposed_at)}</td>
                    <td className="px-4 py-3">
                      {isApproved ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="w-4 h-4" /> Approved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApprove(p)}
                          disabled={isApproving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isApproving ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {isApproving ? 'Approving…' : 'Approve → GHL'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProposed.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
              Approved rows are picked up by the <span className="font-medium">proposed-fires-push</span> cron at 7:15 AM CT daily.
              To push immediately, trigger the edge function manually.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
