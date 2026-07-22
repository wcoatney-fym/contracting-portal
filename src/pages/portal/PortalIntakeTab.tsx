import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency, BusinessIntakeSubmission } from '../../lib/supabase';

interface PortalIntakeTabProps {
  agency: CrmAgency;
  agencyIds: string[];
  agencyNames: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-steel-100 text-steel-600 border border-steel-200', icon: XCircle },
};

const PAGE_SIZE = 25;

export const PortalIntakeTab: React.FC<PortalIntakeTabProps> = ({ agency, agencyIds }) => {
  const [submissions, setSubmissions] = useState<BusinessIntakeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('crm_business_intake')
        .select('*')
        .in('agency_id', agencyIds)
        .order('created_at', { ascending: false });

      setSubmissions(data || []);
      setLoading(false);
    };
    load();
  }, [agencyIds]);

  const filtered = submissions.filter(s => {
    const matchesSearch = !search || [
      s.client_first_name,
      s.client_last_name,
      s.agent_first_name,
      s.agent_last_name,
      s.agent_npn,
      s.policy_number,
      s.carrier,
    ].some(val => val?.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Submitted', 'Agent', 'NPN', 'Client', 'Phone', 'Email', 'State',
      'Carrier', 'Product', 'Policy #', 'Premium', 'Effective Date', 'Status',
    ];
    const rows = filtered.map(s => [
      new Date(s.created_at).toLocaleDateString(),
      `${s.agent_first_name} ${s.agent_last_name}`,
      s.agent_npn,
      `${s.client_first_name} ${s.client_last_name}`,
      s.client_phone || '',
      s.client_email || '',
      s.client_state || '',
      s.carrier,
      s.product_type,
      s.policy_number || '',
      s.premium_amount ? `$${s.premium_amount}` : '',
      s.effective_date || '',
      s.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-intake-${agency.slug || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200 p-4">
          <p className="text-xs font-medium text-steel-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-steel-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Approved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Rejected</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Intake form link */}
      {agency.slug && (
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy-800">New Business Intake Form</p>
            <p className="text-xs text-navy-600 mt-0.5">
              Share this link with your agents to submit new business
            </p>
          </div>
          <a
            href={`/${agency.slug}/intake-form`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white text-sm font-medium rounded-lg hover:bg-navy-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Form
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            placeholder="Search by agent, client, NPN, or policy #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-steel-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="border border-steel-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-navy-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2.5 border border-steel-300 rounded-lg text-sm text-steel-600 hover:bg-steel-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-steel-200 p-12 text-center">
          <FileText className="w-10 h-10 text-steel-300 mx-auto mb-3" />
          <p className="text-steel-500 text-sm">
            {submissions.length === 0
              ? 'No business intake submissions yet. Share your intake form link with agents to get started.'
              : 'No submissions match your filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-steel-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-50 border-b border-steel-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Carrier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Premium</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-steel-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {pageData.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={s.id} className="hover:bg-steel-50 transition-colors">
                      <td className="px-4 py-3 text-steel-600 whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-steel-900">{s.agent_first_name} {s.agent_last_name}</p>
                        <p className="text-xs text-steel-500">NPN: {s.agent_npn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-steel-900">{s.client_first_name} {s.client_last_name}</p>
                        {s.client_phone && <p className="text-xs text-steel-500">{s.client_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-steel-700">{s.product_type}</td>
                      <td className="px-4 py-3 text-steel-700">{s.carrier}</td>
                      <td className="px-4 py-3 text-steel-700 whitespace-nowrap">
                        {s.premium_amount ? `$${Number(s.premium_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-steel-200 bg-steel-50">
              <p className="text-xs text-steel-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs border border-steel-300 rounded-lg disabled:opacity-40 hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs border border-steel-300 rounded-lg disabled:opacity-40 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
