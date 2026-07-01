import React, { useState } from 'react';
import {
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  X,
  Briefcase,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgencyDeal } from '../../lib/supabase';

interface AgencyDealsTabProps {
  agencyId: string;
  deals: AgencyDeal[];
  onDealsUpdated: (deals: AgencyDeal[]) => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
  abandoned: 'bg-gray-100 text-gray-600',
};

export const AgencyDealsTab: React.FC<AgencyDealsTabProps> = ({ agencyId, deals, onDealsUpdated }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = deals.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.deal_name.toLowerCase().includes(q) ||
        (d.contact_name || '').toLowerCase().includes(q) ||
        (d.assigned_agent_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const wonDeals = deals.filter((d) => d.status === 'won');
  const lostDeals = deals.filter((d) => d.status === 'lost');
  const totalRevenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Briefcase} label="Total Deals" value={deals.length.toString()} color="text-navy-600" bg="bg-blue-50" />
        <SummaryCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard icon={Target} label="Won / Lost" value={`${wonDeals.length} / ${lostDeals.length}`} color="text-amber-600" bg="bg-amber-50" />
        <SummaryCard icon={Percent} label="Win Rate" value={`${winRate}%`} color="text-teal-600" bg="bg-teal-50" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {['all', 'open', 'won', 'lost', 'abandoned'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                statusFilter === s ? 'bg-navy-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Close Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{deal.deal_name}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{deal.contact_name || '--'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    ${(deal.value || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{deal.stage || '--'}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600'}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{deal.assigned_agent_name || '--'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                    {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {deals.length === 0 ? 'No deals yet. Connect GHL or add deals manually.' : 'No deals match your filters.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddDealModal
          agencyId={agencyId}
          onClose={() => setShowAddModal(false)}
          onDealAdded={(deal) => {
            onDealsUpdated([...deals, deal]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bg: string;
}> = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

const AddDealModal: React.FC<{
  agencyId: string;
  onClose: () => void;
  onDealAdded: (deal: AgencyDeal) => void;
}> = ({ agencyId, onClose, onDealAdded }) => {
  const [form, setForm] = useState({
    deal_name: '',
    contact_name: '',
    value: '',
    stage: '',
    status: 'open',
    assigned_agent_name: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.deal_name.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('agency_deals')
      .insert({
        agency_id: agencyId,
        deal_name: form.deal_name.trim(),
        contact_name: form.contact_name.trim() || null,
        value: parseFloat(form.value) || 0,
        stage: form.stage.trim() || 'New',
        status: form.status,
        assigned_agent_name: form.assigned_agent_name.trim() || null,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      onDealAdded(data);
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Add Deal</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
            <input type="text" value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} className={inputClass} placeholder="Deal name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inputClass} placeholder="Contact" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <input type="text" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputClass} placeholder="e.g. New, Qualified" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
            <input type="text" value={form.assigned_agent_name} onChange={(e) => setForm({ ...form, assigned_agent_name: e.target.value })} className={inputClass} placeholder="Agent name" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.deal_name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Deal'}
          </button>
        </div>
      </div>
    </div>
  );
};
