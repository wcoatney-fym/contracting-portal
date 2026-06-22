import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Filter,
  Phone,
  Mail,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency, AgencyClient } from '../../lib/supabase';

interface PortalBookTabProps {
  agency: CrmAgency;
  agencyIds: string[];
  agencyNames: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 },
  at_risk: { label: 'At Risk', color: 'bg-gold-50 text-gold-700 border border-gold-200', icon: AlertTriangle },
  terminated: { label: 'Terminated', color: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
  lapsed: { label: 'Lapsed', color: 'bg-steel-100 text-steel-600 border border-steel-200', icon: Clock },
};

const PAGE_SIZE = 25;

export const PortalBookTab: React.FC<PortalBookTabProps> = ({ agency, agencyIds }) => {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agency_clients')
        .select('*')
        .in('agency_id', agencyIds)
        .order('created_at', { ascending: false });

      const allClients: AgencyClient[] = data || [];
      setClients(allClients);

      const agentIds = [...new Set(allClients.map(c => c.agent_id).filter(Boolean))] as string[];
      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from('agents')
          .select('id, first_name, last_name')
          .in('id', agentIds);
        const names: Record<string, string> = {};
        for (const a of (agents || [])) {
          names[a.id] = `${a.first_name} ${a.last_name}`;
        }
        setAgentNames(names);
      }

      setLoading(false);
    };
    load();
  }, [agencyIds.join(',')]);

  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.client_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.carrier.toLowerCase().includes(q) ||
      (c.agent_id && agentNames[c.agent_id]?.toLowerCase().includes(q))
    );
  });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const atRiskClients = clients.filter(c => c.status === 'at_risk');

  const handleExport = () => {
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Status', 'Submit Date', 'Effective Date', 'Carrier', 'Follower', 'Product', 'Policy #', 'Premium'];
    const rows = filtered.map(c => [
      c.first_name,
      c.last_name,
      c.phone,
      c.email,
      c.status,
      c.submit_date ? new Date(c.submit_date).toLocaleDateString() : '',
      c.effective_date || '',
      c.carrier,
      c.ghl_assigned_to,
      c.product_type,
      c.policy_number,
      c.premium_amount.toString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agency.name}_book_of_business.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    all: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    at_risk: clients.filter(c => c.status === 'at_risk').length,
    terminated: clients.filter(c => c.status === 'terminated').length,
    lapsed: clients.filter(c => c.status === 'lapsed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* At-Risk Alert */}
      {atRiskClients.length > 0 && (
        <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-gold-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gold-800">{atRiskClients.length} Client{atRiskClients.length > 1 ? 's' : ''} At Risk</h3>
              <p className="text-xs text-gold-600">These clients need immediate attention to prevent cancellation</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {atRiskClients.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gold-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-steel-800 truncate">{c.client_name}</p>
                  <p className="text-xs text-gold-600">{c.risk_flag_reason || 'Flagged for review'}</p>
                </div>
                <span className="text-xs text-steel-500 flex-shrink-0 ml-2">{c.carrier}</span>
              </div>
            ))}
          </div>
          {atRiskClients.length > 6 && (
            <button
              onClick={() => setStatusFilter('at_risk')}
              className="mt-2 text-xs text-gold-700 font-medium hover:underline"
            >
              View all {atRiskClients.length} at-risk clients
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            placeholder="Search clients, policies, carriers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-navy-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 bg-white border border-steel-200 rounded-xl p-1.5 overflow-x-auto">
        <Filter className="w-3.5 h-3.5 text-steel-400 ml-2 flex-shrink-0" />
        {[
          { key: 'all', label: `All (${counts.all})` },
          { key: 'active', label: `Active (${counts.active})` },
          { key: 'at_risk', label: `At Risk (${counts.at_risk})` },
          { key: 'terminated', label: `Terminated (${counts.terminated})` },
          { key: 'lapsed', label: `Lapsed (${counts.lapsed})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setStatusFilter(f.key); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === f.key ? 'bg-navy-600 text-white shadow-sm' : 'text-steel-600 hover:bg-steel-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-xl border border-steel-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50 border-b border-steel-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Submit Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Effective</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Carrier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Follower</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {paged.map((client) => {
                const status = STATUS_CONFIG[client.status] || STATUS_CONFIG.active;
                const isAtRisk = client.status === 'at_risk';
                const displayName = client.first_name || client.last_name
                  ? `${client.first_name} ${client.last_name}`.trim()
                  : client.client_name;
                return (
                  <tr key={client.id} className={`transition-colors ${isAtRisk ? 'bg-gold-50/30 hover:bg-gold-50/50' : 'hover:bg-steel-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-steel-900">{displayName}</span>
                      {isAtRisk && client.risk_flag_reason && (
                        <p className="text-xs text-gold-600 mt-0.5">{client.risk_flag_reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-xs text-steel-600">
                            <Phone className="w-3 h-3 text-steel-400" />
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1 text-xs text-steel-600">
                            <Mail className="w-3 h-3 text-steel-400" />
                            {client.email}
                          </span>
                        )}
                        {!client.phone && !client.email && (
                          <span className="text-xs text-steel-400">--</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-steel-600">
                      {client.submit_date ? new Date(client.submit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '--'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-steel-500">
                      {client.effective_date ? new Date(client.effective_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '--'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-steel-700">{client.carrier || '--'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-steel-600">{client.ghl_assigned_to || '--'}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-8 h-8 text-steel-300 mx-auto mb-2" />
                    <p className="text-sm text-steel-500">
                      {clients.length === 0 ? 'No clients in book of business yet.' : 'No clients match your filters.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-steel-200 bg-steel-50">
            <p className="text-xs text-steel-500">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-medium text-steel-600 bg-white border border-steel-200 rounded-md hover:bg-steel-100 disabled:opacity-50 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="px-3 py-1.5 text-xs font-medium text-steel-600 bg-white border border-steel-200 rounded-md hover:bg-steel-100 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-steel-200 p-4 text-center">
          <p className="text-lg font-bold text-navy-700">{counts.all}</p>
          <p className="text-xs text-steel-500">Total Clients</p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200 p-4 text-center">
          <p className="text-lg font-bold text-emerald-700">{counts.active}</p>
          <p className="text-xs text-steel-500">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200 p-4 text-center">
          <p className="text-lg font-bold text-gold-600">{counts.at_risk}</p>
          <p className="text-xs text-steel-500">At Risk</p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200 p-4 text-center">
          <p className="text-lg font-bold text-red-600">{counts.terminated + counts.lapsed}</p>
          <p className="text-xs text-steel-500">Lost</p>
        </div>
      </div>
    </div>
  );
};
