import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ToggleLeft,
  FolderOpen,
  LayoutDashboard,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Wifi,
  WifiOff,
  Phone,
  Mail,
  Copy,
  Check,
  Save,
  Building2,
} from 'lucide-react';
import { supabase, formatPhoneDisplay } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';
import { getAncestorPath } from './hierarchyHelpers';
import { AgencyAssetsTab } from '../crm/AgencyAssetsTab';

type ModalTab = 'roster' | 'toggles' | 'assets' | 'overview';

interface AgencyDetailModalProps {
  agency: CrmAgency;
  allAgencies: CrmAgency[];
  onClose: () => void;
  onAgencyUpdated: (updated: CrmAgency) => void;
}

type RosterRow = {
  id: string;
  upload_id: string;
  row_data: Record<string, string>;
  created_at: string;
};

const PAGE_SIZE = 50;

export const AgencyDetailModal: React.FC<AgencyDetailModalProps> = ({
  agency,
  allAgencies,
  onClose,
  onAgencyUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('roster');
  const ancestorPath = getAncestorPath(agency, allAgencies);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const tabs: { key: ModalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'roster', label: 'Roster', icon: FileSpreadsheet },
    { key: 'toggles', label: 'Toggles', icon: ToggleLeft },
    { key: 'assets', label: 'Assets', icon: FolderOpen },
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-navy-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{agency.name}</h2>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {ancestorPath.map((a, i) => (
                  <span key={a.id} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                    <span className={a.id === agency.id ? 'font-medium text-navy-600' : ''}>
                      {a.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 pb-0 bg-gray-50 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                  isActive
                    ? 'bg-white text-navy-700 border border-gray-200 border-b-white -mb-px'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'roster' && <RosterSection agencyName={agency.name} />}
          {activeTab === 'toggles' && (
            <TogglesSection agency={agency} onAgencyUpdated={onAgencyUpdated} />
          )}
          {activeTab === 'assets' && <AgencyAssetsTab agencyName={agency.name} />}
          {activeTab === 'overview' && (
            <OverviewSection agency={agency} allAgencies={allAgencies} />
          )}
        </div>
      </div>
    </div>
  );
};

const RosterSection: React.FC<{ agencyName: string }> = ({ agencyName }) => {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    loadRoster();
  }, [agencyName]);

  const loadRoster = async () => {
    setLoading(true);
    const { data: upload } = await supabase
      .from('crm_roster_uploads')
      .select('*')
      .eq('agency', agencyName)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!upload) {
      setRows([]);
      setHeaders([]);
      setLoading(false);
      return;
    }

    setHeaders(upload.headers || []);

    const { data: rosterRows } = await supabase
      .from('crm_roster')
      .select('*')
      .eq('upload_id', upload.id);

    const sorted = (rosterRows || []).sort((a, b) => {
      const aNum = parseInt(a.row_data['Seat Number'] || '', 10);
      const bNum = parseInt(b.row_data['Seat Number'] || '', 10);
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });
    setRows(sorted);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No roster uploaded</p>
        <p className="text-sm mt-1">Upload a roster via the CRM Team section to see data here.</p>
      </div>
    );
  }

  const filteredRows = searchTerm
    ? rows.filter((row) =>
        Object.values(row.row_data).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : rows;

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const paginatedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const displayHeaders = headers.length > 0
    ? headers.slice(0, 7)
    : ['Seat Number', 'First Name', 'Last Name', 'Phone', 'Email', 'NPN'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{filteredRows.length} agents</span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent w-64"
            placeholder="Search roster..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {displayHeaders.map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {displayHeaders.map((h) => (
                  <td key={h} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {row.row_data[h] || '--'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TogglesSection: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (updated: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const [toggles, setToggles] = useState({
    zaps_paused: agency.zaps_paused,
    csr_can_fill_seat: agency.csr_can_fill_seat,
    is_test: agency.is_test,
    is_alumni: agency.is_alumni,
  });
  const [hiddenTabs, setHiddenTabs] = useState<string[]>(agency.portal_hidden_tabs || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const portalTabOptions = ['dashboard', 'agents', 'book', 'csr', 'tickets', 'cancellations', 'cross-sell'];

  const hasChanges =
    toggles.zaps_paused !== agency.zaps_paused ||
    toggles.csr_can_fill_seat !== agency.csr_can_fill_seat ||
    toggles.is_test !== agency.is_test ||
    toggles.is_alumni !== agency.is_alumni ||
    JSON.stringify(hiddenTabs.sort()) !== JSON.stringify((agency.portal_hidden_tabs || []).sort());

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('crm_agencies')
      .update({
        zaps_paused: toggles.zaps_paused,
        csr_can_fill_seat: toggles.csr_can_fill_seat,
        is_test: toggles.is_test,
        is_alumni: toggles.is_alumni,
        portal_hidden_tabs: hiddenTabs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency.id)
      .select()
      .maybeSingle();

    if (!error && data) {
      onAgencyUpdated(data as CrmAgency);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const togglePortalTab = (tab: string) => {
    setHiddenTabs(prev =>
      prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleCard
          label="Zaps Paused"
          description="When enabled, webhooks will not fire for this agency"
          checked={toggles.zaps_paused}
          onChange={(v) => setToggles({ ...toggles, zaps_paused: v })}
        />
        <ToggleCard
          label="CSR Can Fill Seat"
          description="Allow CSR to auto-fill terminated agent seats"
          checked={toggles.csr_can_fill_seat}
          onChange={(v) => setToggles({ ...toggles, csr_can_fill_seat: v })}
        />
        <ToggleCard
          label="Test Mode"
          description="Mark this agency as a test account"
          checked={toggles.is_test}
          onChange={(v) => setToggles({ ...toggles, is_test: v })}
        />
        <ToggleCard
          label="Alumni"
          description="Mark this agency as an alumni (no longer active client)"
          checked={toggles.is_alumni}
          onChange={(v) => setToggles({ ...toggles, is_alumni: v })}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Portal Tab Visibility</h3>
        <p className="text-xs text-gray-500 mb-4">Checked tabs are hidden from the agency portal.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {portalTabOptions.map((tab) => (
            <label key={tab} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hiddenTabs.includes(tab)}
                onChange={() => togglePortalTab(tab)}
                className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
              />
              <span className="text-sm text-gray-700 capitalize">{tab}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <Check className="w-4 h-4" />
            Saved successfully
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const ToggleCard: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-navy-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const OverviewSection: React.FC<{
  agency: CrmAgency;
  allAgencies: CrmAgency[];
}> = ({ agency, allAgencies }) => {
  const [agentsOnboarded, setAgentsOnboarded] = useState(0);
  const [agentsInPipeline, setAgentsInPipeline] = useState(0);
  const [ghlStatus, setGhlStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const childAgencies = allAgencies.filter(a => a.parent_agency_id === agency.id && a.is_active);

  useEffect(() => {
    const load = async () => {
      const [onboardedRes, pipelineRes, ghlRes] = await Promise.all([
        supabase.from('crm_pipeline').select('id', { count: 'exact', head: true }).eq('agency', agency.name).eq('stage', 'completed'),
        supabase.from('crm_pipeline').select('id', { count: 'exact', head: true }).eq('agency', agency.name).neq('stage', 'completed').neq('stage', 'terminated'),
        supabase.from('agency_ghl_configs').select('connection_status').eq('agency_id', agency.id).maybeSingle(),
      ]);
      setAgentsOnboarded(onboardedRes.count || 0);
      setAgentsInPipeline(pipelineRes.count || 0);
      setGhlStatus(ghlRes.data?.connection_status || null);
    };
    load();
  }, [agency.id, agency.name]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const portalUrl = agency.slug
    ? `${window.location.origin}/${agency.slug}`
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Agents Onboarded" value={agentsOnboarded} />
        <StatCard label="In Pipeline" value={agentsInPipeline} />
        <StatCard label="Seat Count" value={agency.seat_count} />
        <StatCard label="Sub-Agencies" value={childAgencies.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Agency Details</h3>
          <DetailRow label="Onboarding Status">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              agency.onboarding_status === 'onboarding_complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {agency.onboarding_status === 'onboarding_complete' ? 'Complete' : 'In Progress'}
            </span>
          </DetailRow>
          <DetailRow label="Type">
            <span className="text-sm text-gray-900 capitalize">{agency.agency_type}</span>
          </DetailRow>
          <DetailRow label="CRM Number">
            <span className="text-sm text-gray-900">{agency.crm_number ? formatPhoneDisplay(agency.crm_number) : '--'}</span>
          </DetailRow>
          <DetailRow label="GHL Status">
            {ghlStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <Wifi className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <WifiOff className="w-3.5 h-3.5" /> Not connected
              </span>
            )}
          </DetailRow>
          {portalUrl && (
            <DetailRow label="Portal URL">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-navy-600 truncate max-w-[180px]">{agency.slug}</span>
                <button
                  onClick={() => handleCopy(portalUrl, 'url')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
            </DetailRow>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Assigned CSR</h3>
          {agency.assigned_csr ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy-50 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-navy-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{agency.assigned_csr}</p>
                  {agency.csr_npn && <p className="text-xs text-gray-400">NPN: {agency.csr_npn}</p>}
                </div>
              </div>
              {agency.csr_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {formatPhoneDisplay(agency.csr_phone)}
                </div>
              )}
              {agency.csr_email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {agency.csr_email}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <UserCheck className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No CSR assigned</p>
            </div>
          )}
        </div>
      </div>

      {childAgencies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sub-Agencies</h3>
          <div className="flex flex-wrap gap-2">
            {childAgencies.map(child => (
              <span
                key={child.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-navy-600 bg-navy-50 border border-navy-100 rounded-lg"
              >
                {child.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
    <p className="text-2xl font-bold text-navy-700">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    {children}
  </div>
);
