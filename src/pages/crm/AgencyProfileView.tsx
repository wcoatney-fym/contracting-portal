import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  Rocket,
  Link2,
  TrendingUp,
  Users,
  FolderOpen,
  Building2,
  Contact,
  CalendarDays,
  CalendarRange,
  Repeat2,
  ShieldCheck,
  XCircle,
  UserPlus,
  GitBranchPlus,
  UserCheck,
  Phone,
  Mail,
  FlaskConical,
  ChevronRight,
  GitBranch,
  Wifi,
  WifiOff,
  MessageSquareText,
  Globe,
  Eye,
  EyeOff,
  Save,
  Send,
  Clock,
  Tag,
  User,
  Pencil,
  Check,
  Zap,
  ZapOff,
  Package,
  AlertTriangle,
  Settings,
  X,
} from 'lucide-react';
import { supabase, formatPhoneDisplay } from '../../lib/supabase';
import { avgContactsPerWeek, avgContactsPerMonth } from '../../lib/kpiHelpers';
import { backfillCrossSellDefaults } from '../../lib/crossSellHelpers';
import type { CrmAgency, AgencyGhlConfig, AgencyDeal, AgencyKpi, CrmTicket, CrmTicketMessage } from '../../lib/supabase';
import { AgencyOnboardingView } from './AgencyOnboardingView';
import { AgencyGhlTab } from './AgencyGhlTab';
import { AgencyDealsTab } from './AgencyDealsTab';
import { AgencyAgentsTab } from './AgencyAgentsTab';
import { AgencyAssetsTab } from './AgencyAssetsTab';
import { AgencyContactsTab } from './AgencyContactsTab';
import { CrossSellSection } from './CrossSellSection';

type ProfileTab = 'overview' | 'onboarding' | 'cross-sell' | 'ghl' | 'deals' | 'agents' | 'contacts' | 'assets' | 'tickets';

interface AgencyProfileViewProps {
  agency: CrmAgency;
  allAgencies: CrmAgency[];
  onBack: () => void;
  onAgencyUpdated: (updated: CrmAgency) => void;
  onNavigateToAgency: (agency: CrmAgency) => void;
}

const PROFILE_TABS: { key: ProfileTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'onboarding', label: 'Onboarding', icon: Rocket },
  { key: 'cross-sell', label: 'Cross-Sell', icon: Package },
  { key: 'ghl', label: 'GHL Connection', icon: Link2 },
  { key: 'deals', label: 'Deals', icon: TrendingUp },
  { key: 'agents', label: 'Agents', icon: Users },
  { key: 'contacts', label: 'Contacts', icon: Contact },
  { key: 'assets', label: 'Roster & Assets', icon: FolderOpen },
  { key: 'tickets', label: 'Tickets', icon: MessageSquareText },
];

export const AgencyProfileView: React.FC<AgencyProfileViewProps> = ({
  agency: initialAgency,
  allAgencies,
  onBack,
  onAgencyUpdated,
  onNavigateToAgency,
}) => {
  const [agency, setAgency] = useState<CrmAgency>(initialAgency);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [ghlConfig, setGhlConfig] = useState<AgencyGhlConfig | null>(null);
  const [deals, setDeals] = useState<AgencyDeal[]>([]);
  const [kpi, setKpi] = useState<AgencyKpi | null>(null);
  const [agentsOnboarded, setAgentsOnboarded] = useState(0);
  const [agentsInPipeline, setAgentsInPipeline] = useState(0);

  const parentAgency = agency.agency_type === 'sub' && agency.parent_agency_id
    ? allAgencies.find((a) => a.id === agency.parent_agency_id) || null
    : null;
  const childAgencies = agency.agency_type === 'main'
    ? allAgencies.filter((a) => a.parent_agency_id === agency.id)
    : [];

  useEffect(() => {
    const load = async () => {
      const [ghlRes, dealsRes, kpiRes, onboardedRes, pipelineRes] = await Promise.all([
        supabase.from('agency_ghl_configs').select('*').eq('agency_id', agency.id).maybeSingle(),
        supabase.from('agency_deals').select('*').eq('agency_id', agency.id),
        supabase.from('agency_kpis').select('*').eq('agency_id', agency.id).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('crm_pipeline').select('id', { count: 'exact', head: true }).eq('agency', agency.name).eq('stage', 'completed'),
        supabase.from('crm_pipeline').select('id', { count: 'exact', head: true }).eq('agency', agency.name).neq('stage', 'completed').neq('stage', 'terminated'),
      ]);

      setGhlConfig(ghlRes.data || null);
      setDeals(dealsRes.data || []);
      setKpi(kpiRes.data || null);
      setAgentsOnboarded(onboardedRes.count || 0);
      setAgentsInPipeline(pipelineRes.count || 0);
    };
    load();
  }, [agency.id, agency.name]);

  const handleAgencyUpdated = (updated: CrmAgency) => {
    setAgency(updated);
    onAgencyUpdated(updated);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            agency={agency}
            ghlConfig={ghlConfig}
            kpi={kpi}
            agentsOnboarded={agentsOnboarded}
            agentsInPipeline={agentsInPipeline}
            childAgencies={childAgencies}
            parentAgency={parentAgency}
            onNavigateToAgency={onNavigateToAgency}
            onTabChange={setActiveTab}
            onAgencyUpdated={handleAgencyUpdated}
          />
        );
      case 'onboarding':
        return (
          <AgencyOnboardingView
            agency={agency}
            allAgencies={allAgencies}
            onBack={() => setActiveTab('overview')}
            onAgencyUpdated={handleAgencyUpdated}
            onNavigateToAgency={onNavigateToAgency}
          />
        );
      case 'cross-sell':
        return (
          <CrossSellSection
            agencyId={agency.id}
            agencyName={agency.name}
            csrFirstName={agency.csr_first_name}
            csrLastName={agency.csr_last_name}
            csrPhone={agency.csr_phone}
            csrEmail={agency.csr_email}
            agencyPhone={agency.agency_phone}
            agencyUrlPrefix={agency.agency_url_prefix}
          />
        );
      case 'ghl':
        return <AgencyGhlTab agencyId={agency.id} config={ghlConfig} onConfigUpdated={setGhlConfig} />;
      case 'deals':
        return <AgencyDealsTab agencyId={agency.id} deals={deals} onDealsUpdated={setDeals} />;
      case 'agents':
        return <AgencyAgentsTab agencyName={agency.name} agencyId={agency.id} />;
      case 'contacts':
        return <AgencyContactsTab agencyId={agency.id} agencyName={agency.name} />;
      case 'assets':
        return <AgencyAssetsTab agencyName={agency.name} />;
      case 'tickets':
        return <AdminTicketsTab agencyId={agency.id} agencyName={agency.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agencies
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{agency.name}</h2>
            <div className="flex items-center gap-2">
              {parentAgency && (
                <button
                  onClick={() => onNavigateToAgency(parentAgency)}
                  className="text-xs text-navy-600 hover:underline"
                >
                  Parent: {parentAgency.name}
                </button>
              )}
              {agency.crm_number && (
                <span className="text-xs text-gray-400">CRM #{formatPhoneDisplay(agency.crm_number)}</span>
              )}
            </div>
          </div>
          {agency.agency_type === 'sub' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              <GitBranch className="w-3 h-3" />
              Sub
            </span>
          )}
          {agency.is_test && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
              <FlaskConical className="w-3 h-3" />
              Test
            </span>
          )}
          {ghlConfig?.connection_status === 'connected' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
              <Wifi className="w-3 h-3" />
              GHL Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
              <WifiOff className="w-3 h-3" />
              GHL Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
        {PROFILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                isActive ? 'bg-navy-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {agency.zaps_paused && (
        <ZapsPausedBanner agency={agency} onAgencyUpdated={handleAgencyUpdated} />
      )}

      {renderTab()}
    </div>
  );
};

const ZapsPausedBanner: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const [enabling, setEnabling] = useState(false);

  const handleEnable = async () => {
    setEnabling(true);
    const { data, error } = await supabase
      .from('crm_agencies')
      .update({ zaps_paused: false })
      .eq('id', agency.id)
      .select()
      .maybeSingle();

    if (!error && data) {
      onAgencyUpdated(data as CrmAgency);
    }
    setEnabling(false);
  };

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <ZapOff className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800">Zaps are paused for this agency</p>
          <p className="text-xs text-amber-600">Webhooks will not fire until you enable them after backfilling data.</p>
        </div>
      </div>
      <button
        onClick={handleEnable}
        disabled={enabling}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
      >
        <Zap className="w-4 h-4" />
        {enabling ? 'Enabling...' : 'Enable Zaps'}
      </button>
    </div>
  );
};

const OverviewTab: React.FC<{
  agency: CrmAgency;
  ghlConfig: AgencyGhlConfig | null;
  kpi: AgencyKpi | null;
  agentsOnboarded: number;
  agentsInPipeline: number;
  childAgencies: CrmAgency[];
  parentAgency: CrmAgency | null;
  onNavigateToAgency: (a: CrmAgency) => void;
  onTabChange: (tab: ProfileTab) => void;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({
  agency,
  ghlConfig,
  kpi,
  agentsOnboarded,
  agentsInPipeline,
  childAgencies,
  onNavigateToAgency,
  onTabChange,
  onAgencyUpdated,
}) => {
  const fmt = (val: number | undefined) => (val ?? 0).toLocaleString();

  return (
    <div className="space-y-6">
      <MissingFieldsBanner agency={agency} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewKpiCard icon={Contact} label="Total Contacts" value={fmt(kpi?.total_contacts)} color="text-navy-600" bgColor="bg-blue-50" />
        <OverviewKpiCard icon={CalendarDays} label="Avg Contacts / Week" value={fmt(kpi ? avgContactsPerWeek(kpi.total_contacts, agency.date_created, agency.dba_client_count) : 0)} color="text-cyan-600" bgColor="bg-cyan-50" />
        <OverviewKpiCard icon={CalendarRange} label="Avg Contacts / Month" value={fmt(kpi ? avgContactsPerMonth(kpi.total_contacts, agency.date_created, agency.dba_client_count) : 0)} color="text-sky-600" bgColor="bg-sky-50" />
        <OverviewKpiCard icon={Repeat2} label="Cross-Sell Opps" value={fmt(kpi?.cross_sell_opportunities)} color="text-amber-600" bgColor="bg-amber-50" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewKpiCard icon={ShieldCheck} label="Saved Policies" value={fmt(kpi?.saved_policies)} color="text-emerald-600" bgColor="bg-emerald-50" />
        <OverviewKpiCard icon={XCircle} label="Cancellations" value={fmt(kpi?.cancellations)} color="text-red-600" bgColor="bg-red-50" />
        <OverviewKpiCard icon={UserPlus} label="Agents Onboarded" value={agentsOnboarded.toLocaleString()} color="text-teal-600" bgColor="bg-teal-50" />
        <OverviewKpiCard icon={GitBranchPlus} label="Agents In Pipeline" value={agentsInPipeline.toLocaleString()} color="text-navy-600" bgColor="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Agency Details</h3>
          <div className="space-y-3">
            <DetailRow label="Onboarding Status">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                agency.onboarding_status === 'onboarding_complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {agency.onboarding_status === 'onboarding_complete' ? 'Complete' : 'In Progress'}
              </span>
            </DetailRow>
            <DetailRow label="Agency Type">
              <span className="text-sm text-gray-900 capitalize">{agency.agency_type}</span>
            </DetailRow>
            <DetailRow label="Date Added">
              <span className="text-sm text-gray-900">
                {new Date(agency.date_added).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </DetailRow>
            <EditableDateCreatedRow agency={agency} onAgencyUpdated={onAgencyUpdated} />
            <EditableDbaClientCountRow agency={agency} onAgencyUpdated={onAgencyUpdated} />
            <DetailRow label="CRM Number">
              <span className="text-sm text-gray-900">{agency.crm_number ? formatPhoneDisplay(agency.crm_number) : '--'}</span>
            </DetailRow>
            <DetailRow label="GHL Status">
              {ghlConfig?.connection_status === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                  <Wifi className="w-3.5 h-3.5" />
                  Connected
                  {ghlConfig.last_sync_at && (
                    <span className="text-xs text-gray-400 ml-1">
                      (synced {new Date(ghlConfig.last_sync_at).toLocaleDateString()})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm text-gray-400">Not connected</span>
              )}
            </DetailRow>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Assigned CSR</h3>
          {agency.assigned_csr ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-navy-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{agency.assigned_csr}</p>
                  {agency.csr_npn && <p className="text-xs text-gray-400">NPN: {agency.csr_npn}</p>}
                </div>
              </div>
              {agency.csr_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {formatPhoneDisplay(agency.csr_phone)}
                </div>
              )}
              {agency.csr_email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {agency.csr_email}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <UserCheck className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No CSR assigned</p>
              <button
                onClick={() => onTabChange('onboarding')}
                className="mt-2 text-xs text-navy-600 hover:underline"
              >
                Go to Onboarding to assign
              </button>
            </div>
          )}
        </div>
      </div>

      {childAgencies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sub-Agencies</h3>
          <div className="flex flex-wrap gap-2">
            {childAgencies.map((child) => (
              <button
                key={child.id}
                onClick={() => onNavigateToAgency(child)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-navy-600 bg-navy-600/5 border border-navy-600/15 rounded-lg hover:bg-navy-50 transition-colors"
              >
                {child.name}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {agency.slug && (
        <PortalSettingsCard agency={agency} onAgencyUpdated={onAgencyUpdated} />
      )}

      <AgencyConfigCard agency={agency} onAgencyUpdated={onAgencyUpdated} />

      <AgencyCrossSellAdminCard agency={agency} onAgencyUpdated={onAgencyUpdated} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickLink label="Onboarding" onClick={() => onTabChange('onboarding')} />
        <QuickLink label="GHL Connection" onClick={() => onTabChange('ghl')} />
        <QuickLink label="Deals" onClick={() => onTabChange('deals')} />
        <QuickLink label="Roster & Assets" onClick={() => onTabChange('assets')} />
      </div>
    </div>
  );
};

const OverviewKpiCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}> = ({ icon: Icon, label, value, color, bgColor }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center mb-2`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    {children}
  </div>
);

const EditableDateCreatedRow: React.FC<{ agency: CrmAgency; onAgencyUpdated: (a: CrmAgency) => void }> = ({ agency, onAgencyUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(agency.date_created || '');

  const handleSave = async () => {
    if (!value) return;
    const { error } = await supabase
      .from('crm_agencies')
      .update({ date_created: value, updated_at: new Date().toISOString() })
      .eq('id', agency.id);
    if (!error) {
      onAgencyUpdated({ ...agency, date_created: value });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">Date Created</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-navy-500 focus:border-transparent"
          />
          <button onClick={handleSave} className="p-1 hover:bg-emerald-50 rounded transition-colors">
            <Check className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">
            {agency.date_created
              ? new Date(agency.date_created + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '--'}
          </span>
          <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

const EditableDbaClientCountRow: React.FC<{ agency: CrmAgency; onAgencyUpdated: (a: CrmAgency) => void }> = ({ agency, onAgencyUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(agency.dba_client_count || 0));

  const handleSave = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    const { error } = await supabase
      .from('crm_agencies')
      .update({ dba_client_count: parsed, updated_at: new Date().toISOString() })
      .eq('id', agency.id);
    if (!error) {
      onAgencyUpdated({ ...agency, dba_client_count: parsed });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">DBA Client Count</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-navy-500 focus:border-transparent"
          />
          <button onClick={handleSave} className="p-1 hover:bg-emerald-50 rounded transition-colors">
            <Check className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{(agency.dba_client_count || 0).toLocaleString()}</span>
          <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

const QuickLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-navy-600/30 hover:shadow-sm transition-all text-sm font-medium text-gray-700 group"
  >
    {label}
    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy-600 transition-colors" />
  </button>
);

const PortalSettingsCard: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState(agency.portal_password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('crm_agencies')
      .update({ portal_password: password.trim(), updated_at: new Date().toISOString() })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, portal_password: password.trim() });
      setEditing(false);
    }
    setSaving(false);
  };

  const portalUrl = `/${agency.slug}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-navy-600" />
        <h3 className="text-sm font-semibold text-gray-700">Agency Portal</h3>
      </div>
      <div className="space-y-3">
        <DetailRow label="Portal URL">
          <span className="text-sm font-mono font-medium text-navy-600">{portalUrl}</span>
        </DetailRow>
        <DetailRow label="Portal Password">
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !password.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setPassword(agency.portal_password || ''); }}
                className="px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-mono">{agency.portal_password || '--'}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-navy-600 hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </DetailRow>
      </div>

      <PortalTabToggles agency={agency} onAgencyUpdated={onAgencyUpdated} />
    </div>
  );
};

const BACKFILL_FIELDS: { key: keyof CrmAgency; label: string }[] = [
  { key: 'csr_first_name', label: 'CSR First Name' },
  { key: 'csr_last_name', label: 'CSR Last Name' },
  { key: 'csr_phone', label: 'CSR Phone' },
  { key: 'csr_email', label: 'CSR Email' },
  { key: 'csr_npn', label: 'CSR NPN' },
  { key: 'csr_gender', label: 'CSR Gender' },
  { key: 'agency_phone', label: 'Agency Phone' },
  { key: 'business_name', label: 'Business Name' },
  { key: 'business_logo_url', label: 'Business Logo URL' },
  { key: 'agency_url_prefix', label: 'Agency URL Prefix' },
  { key: 'calendar_embed_code', label: 'Calendar Embed Code' },
];

const isFieldBlank = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

const getMissingFieldLabels = (agency: CrmAgency): string[] =>
  BACKFILL_FIELDS.filter((f) => isFieldBlank(agency[f.key])).map((f) => f.label);

const MissingFieldsBanner: React.FC<{ agency: CrmAgency }> = ({ agency }) => {
  const [dismissed, setDismissed] = useState(false);
  const missing = getMissingFieldLabels(agency);

  if (dismissed || missing.length === 0) return null;

  const handleScrollToConfig = () => {
    const el = document.getElementById('agency-config-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-amber-900">
          {missing.length} field{missing.length === 1 ? '' : 's'} missing on this agency
        </h4>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          {missing.slice(0, 6).join(', ')}
          {missing.length > 6 ? `, and ${missing.length - 6} more` : ''}
        </p>
        <button
          onClick={handleScrollToConfig}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
        >
          Fill in now
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-100 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-amber-600" />
      </button>
    </div>
  );
};

type FieldKind = 'text' | 'email' | 'phone' | 'url' | 'gender' | 'textarea';

const AgencyConfigCard: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const sections: {
    title: string;
    fields: { key: keyof CrmAgency; label: string; kind: FieldKind; placeholder?: string }[];
  }[] = [
    {
      title: 'CSR Details',
      fields: [
        { key: 'csr_first_name', label: 'First Name', kind: 'text', placeholder: 'Jane' },
        { key: 'csr_last_name', label: 'Last Name', kind: 'text', placeholder: 'Doe' },
        { key: 'csr_phone', label: 'Phone', kind: 'phone', placeholder: '555-555-5555' },
        { key: 'csr_email', label: 'Email', kind: 'email', placeholder: 'jane@agency.com' },
        { key: 'csr_npn', label: 'NPN', kind: 'text', placeholder: '12345678' },
        { key: 'csr_gender', label: 'Gender', kind: 'gender' },
      ],
    },
    {
      title: 'Branding & Portal',
      fields: [
        { key: 'business_name', label: 'Business Name', kind: 'text', placeholder: 'Wisechoice Insurance' },
        { key: 'business_logo_url', label: 'Business Logo URL', kind: 'url', placeholder: 'https://...' },
        { key: 'agency_url_prefix', label: 'Agency URL Prefix', kind: 'url', placeholder: 'https://book.agency.com/' },
        { key: 'calendar_embed_code', label: 'Calendar Embed Code', kind: 'textarea' },
      ],
    },
    {
      title: 'Contact Info',
      fields: [{ key: 'agency_phone', label: 'Agency Phone', kind: 'phone', placeholder: '555-555-5555' }],
    },
  ];

  return (
    <div id="agency-config-card" className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-4 h-4 text-navy-600" />
        <h3 className="text-sm font-semibold text-gray-700">Agency Configuration</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Backfill or update any agency field below. Changes save immediately.
      </p>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.fields.map((f) => (
                <BackfillRow
                  key={String(f.key)}
                  agency={agency}
                  fieldKey={f.key}
                  label={f.label}
                  kind={f.kind}
                  placeholder={f.placeholder}
                  onAgencyUpdated={onAgencyUpdated}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BackfillRow: React.FC<{
  agency: CrmAgency;
  fieldKey: keyof CrmAgency;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, fieldKey, label, kind, placeholder, onAgencyUpdated }) => {
  const currentRaw = agency[fieldKey];
  const current = typeof currentRaw === 'string' ? currentRaw : currentRaw == null ? '' : String(currentRaw);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(current);
  }, [current]);

  const isBlank = isFieldBlank(currentRaw);

  const handleSave = async () => {
    setSaving(true);
    const trimmed = value.trim();
    const updates: Record<string, unknown> = {
      [fieldKey]: trimmed === '' ? null : trimmed,
      updated_at: new Date().toISOString(),
    };

    if (fieldKey === 'csr_first_name' || fieldKey === 'csr_last_name') {
      const first = fieldKey === 'csr_first_name' ? trimmed : (agency.csr_first_name || '').trim();
      const last = fieldKey === 'csr_last_name' ? trimmed : (agency.csr_last_name || '').trim();
      const fullName = `${first} ${last}`.trim();
      updates.assigned_csr = fullName || null;
    }

    const { error } = await supabase
      .from('crm_agencies')
      .update(updates)
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, ...(updates as Partial<CrmAgency>) });
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setValue(current);
    setEditing(false);
  };

  const renderDisplay = () => {
    if (isBlank) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Not set
        </span>
      );
    }
    if (kind === 'phone') {
      return <span className="text-sm text-gray-900">{formatPhoneDisplay(current)}</span>;
    }
    if (kind === 'url' && current.startsWith('http')) {
      return (
        <a
          href={current}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-navy-600 hover:underline truncate max-w-[280px] inline-block"
        >
          {current}
        </a>
      );
    }
    if (kind === 'textarea') {
      return (
        <span className="text-sm text-gray-900 font-mono truncate max-w-[280px] inline-block">
          {current.length > 40 ? `${current.slice(0, 40)}...` : current}
        </span>
      );
    }
    if (kind === 'gender') {
      return <span className="text-sm text-gray-900 capitalize">{current}</span>;
    }
    return <span className="text-sm text-gray-900 truncate max-w-[280px] inline-block">{current}</span>;
  };

  const renderInput = () => {
    if (kind === 'gender') {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-navy-500 focus:border-transparent"
        >
          <option value="">--</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      );
    }
    if (kind === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-72 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-navy-500 focus:border-transparent font-mono"
        />
      );
    }
    return (
      <input
        type={kind === 'email' ? 'email' : kind === 'phone' ? 'tel' : kind === 'url' ? 'url' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-72 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-navy-500 focus:border-transparent"
      />
    );
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-sm text-gray-500 pt-1 flex-shrink-0">{label}</span>
      <div className="flex items-start gap-2">
        {editing ? (
          <>
            {renderInput()}
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50 mt-0.5"
              aria-label="Save"
            >
              <Check className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 mt-0.5"
              aria-label="Cancel"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </>
        ) : (
          <>
            {renderDisplay()}
            <button
              onClick={() => setEditing(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
              aria-label={`Edit ${label}`}
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const AgencyCrossSellAdminCard: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const [working, setWorking] = useState<'confirm' | 'unconfirm' | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const confirmed = !!agency.cross_sell_confirmed;

  const handleConfirmNoZap = async () => {
    if (working) return;
    setWorking('confirm');
    setResultMessage(null);

    await backfillCrossSellDefaults(agency.id, {
      csrFirstName: agency.csr_first_name,
      csrLastName: agency.csr_last_name,
      csrPhone: agency.csr_phone,
      csrEmail: agency.csr_email,
      agencyPhone: agency.agency_phone,
      agencyUrlPrefix: agency.agency_url_prefix,
    });

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('crm_agencies')
      .update({ cross_sell_confirmed: true, updated_at: now })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, cross_sell_confirmed: true });
      setResultMessage('Cross-sell defaults backfilled and confirmed. No webhook fired.');
    } else {
      setResultMessage('Failed to confirm cross-sell. Try again.');
    }
    setWorking(null);
  };

  const handleUnconfirm = async () => {
    if (working) return;
    setWorking('unconfirm');
    setResultMessage(null);

    const { error } = await supabase
      .from('crm_agencies')
      .update({ cross_sell_confirmed: false, updated_at: new Date().toISOString() })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, cross_sell_confirmed: false });
      setResultMessage('Cross-sell unconfirmed.');
    } else {
      setResultMessage('Failed to unconfirm. Try again.');
    }
    setWorking(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-700">Cross-Sell Status</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Backfill default cross-sell content and mark as confirmed without firing the cross-sell webhook.
      </p>

      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              confirmed ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {confirmed ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {confirmed ? 'Confirmed' : 'Not Confirmed'}
            </p>
            <p className="text-xs text-gray-500">
              {confirmed
                ? 'Cross-sell products are confirmed for this agency.'
                : 'Cross-sell defaults have not been confirmed yet.'}
            </p>
          </div>
        </div>
        {confirmed ? (
          <button
            onClick={handleUnconfirm}
            disabled={!!working}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {working === 'unconfirm' ? 'Working...' : 'Unconfirm'}
          </button>
        ) : (
          <button
            onClick={handleConfirmNoZap}
            disabled={!!working}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {working === 'confirm' ? 'Working...' : 'Backfill & Confirm (No Webhook)'}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          This action skips the standard cross-sell webhook. Use only when backfilling existing agencies.
        </span>
      </div>

      {resultMessage && (
        <p className="mt-3 text-xs font-medium text-gray-700">{resultMessage}</p>
      )}
    </div>
  );
};

const PORTAL_TAB_OPTIONS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'agents', label: 'Agent Management' },
  { key: 'book', label: 'Book of Business' },
  { key: 'cancellations', label: 'Cancellation Upload' },
  { key: 'tickets', label: 'Support' },
  { key: 'csr', label: 'CSR Contact' },
];

const PortalTabToggles: React.FC<{
  agency: CrmAgency;
  onAgencyUpdated: (a: CrmAgency) => void;
}> = ({ agency, onAgencyUpdated }) => {
  const [saving, setSaving] = useState<string | null>(null);
  const hiddenTabs = agency.portal_hidden_tabs || [];

  const toggleTab = async (tabKey: string) => {
    setSaving(tabKey);
    const isHidden = hiddenTabs.includes(tabKey);
    const updated = isHidden
      ? hiddenTabs.filter(t => t !== tabKey)
      : [...hiddenTabs, tabKey];

    const { error } = await supabase
      .from('crm_agencies')
      .update({ portal_hidden_tabs: updated, updated_at: new Date().toISOString() })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, portal_hidden_tabs: updated });
    }
    setSaving(null);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Portal Tab Visibility</p>
      <div className="space-y-2">
        {PORTAL_TAB_OPTIONS.map(tab => {
          const isHidden = hiddenTabs.includes(tab.key);
          return (
            <div key={tab.key} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">{tab.label}</span>
              <button
                onClick={() => toggleTab(tab.key)}
                disabled={saving === tab.key}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isHidden ? 'bg-gray-300' : 'bg-emerald-500'
                } ${saving === tab.key ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    isHidden ? 'translate-x-0.5' : 'translate-x-[18px]'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      {hiddenTabs.length > 0 && (
        <p className="text-xs text-amber-600 mt-2">
          {hiddenTabs.length} tab{hiddenTabs.length > 1 ? 's' : ''} showing as "Coming Soon" on the portal
        </p>
      )}
    </div>
  );
};

const TICKET_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
};

const TICKET_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-50 text-blue-700' },
  high: { label: 'High', color: 'bg-red-50 text-red-700' },
};

const TICKET_CATEGORY_LABELS: Record<string, string> = {
  'agent-issue': 'Agent Issue',
  'crm-issue': 'CRM Issue',
  billing: 'Billing',
  other: 'Other',
};

function ticketTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const AdminTicketsTab: React.FC<{ agencyId: string; agencyName: string }> = ({ agencyId, agencyName }) => {
  const [tickets, setTickets] = useState<CrmTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<CrmTicket | null>(null);

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from('crm_tickets')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <AdminTicketDetail
        ticket={selectedTicket}
        agencyName={agencyName}
        onBack={() => { setSelectedTicket(null); loadTickets(); }}
        onTicketUpdated={(updated) => {
          setSelectedTicket(updated);
          setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
        }}
      />
    );
  }

  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in-progress').length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Support Tickets from {agencyName}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {openCount > 0 ? `${openCount} open ticket${openCount !== 1 ? 's' : ''}` : 'No open tickets'}
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquareText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tickets submitted by this agency yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const status = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open;
            const priority = TICKET_PRIORITY_CONFIG[ticket.priority] || TICKET_PRIORITY_CONFIG.normal;
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-navy-600/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-navy-600 transition-colors">
                    {ticket.subject}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1 mb-2">{ticket.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${priority.color}`}>{priority.label}</span>
                  <span>{TICKET_CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                  <span>{ticketTimeAgo(ticket.created_at)}</span>
                  <span>by {ticket.submitted_by}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminTicketDetail: React.FC<{
  ticket: CrmTicket;
  agencyName: string;
  onBack: () => void;
  onTicketUpdated: (t: CrmTicket) => void;
}> = ({ ticket, agencyName, onBack, onTicketUpdated }) => {
  const [messages, setMessages] = useState<CrmTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('crm_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('crm_ticket_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'admin',
      sender_name: 'FYM Support',
      message: newMessage.trim(),
    });
    if (!error) {
      setNewMessage('');
      loadMessages();
    }
    setSending(false);
  };

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('crm_tickets')
      .update(updates)
      .eq('id', ticket.id);

    if (!error) {
      onTicketUpdated({ ...ticket, status: newStatus as CrmTicket['status'], ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) });
    }
    setUpdatingStatus(false);
  };

  const status = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open;
  const priority = TICKET_PRIORITY_CONFIG[ticket.priority] || TICKET_PRIORITY_CONFIG.normal;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tickets
      </button>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold text-gray-900">{ticket.subject}</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
            <span className={`px-1.5 py-0.5 rounded font-medium ${priority.color}`}>{priority.label} Priority</span>
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{TICKET_CATEGORY_LABELS[ticket.category] || ticket.category}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>by {ticket.submitted_by}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Change status:</span>
            {['open', 'in-progress', 'resolved', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updatingStatus || ticket.status === s}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors ${
                  ticket.status === s
                    ? TICKET_STATUS_CONFIG[s]?.color || ''
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                {TICKET_STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No replies yet.</div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.sender_type === 'admin';
              return (
                <div key={msg.id} className={`px-6 py-4 ${isAdmin ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAdmin ? 'bg-navy-50' : 'bg-gray-100'}`}>
                      {isAdmin ? <ShieldCheck className="w-3 h-3 text-navy-600" /> : <User className="w-3 h-3 text-gray-500" />}
                    </div>
                    <span className={`text-sm font-medium ${isAdmin ? 'text-navy-600' : 'text-gray-900'}`}>{msg.sender_name}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase">{isAdmin ? 'Admin' : agencyName}</span>
                    <span className="text-xs text-gray-400 ml-auto">{ticketTimeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap pl-8">{msg.message}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={2}
              placeholder="Reply as FYM Support..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
