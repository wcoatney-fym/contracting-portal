import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  BarChart3,
  Building2,
  ClipboardList,
  GitBranchPlus,
  BookUser,
  FileSpreadsheet,
  FlaskConical,
  Lock,
  ShieldCheck,
  ScrollText,
  Search,
  X,
  ChevronDown,
  Layers,
  Wrench,
  Zap,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';
import { KpiDashboardTab } from './crm/KpiDashboardTab';
import { AgenciesTab } from './crm/AgenciesTab';
import { TaskboardCurrentTab } from './crm/TaskboardCurrentTab';
import { TaskboardOnboardingTab } from './crm/TaskboardOnboardingTab';
import { PipelineTab } from './crm/PipelineTab';
import { RosterTab } from './crm/RosterTab';
import { TemplateManagementTab } from './crm/TemplateManagementTab';
import { TestingTab } from './crm/TestingTab';
import { ActivityHistoryTab } from './crm/ActivityHistoryTab';
import { ContactImportTab } from './crm/ContactImportTab';

type CrmView = 'dashboard' | 'agencies' | 'work-queue' | 'pipeline' | 'roster' | 'templates' | 'testing' | 'history' | 'contact-import';

type NavItem = { key: CrmView; label: string; icon: React.FC<{ className?: string }> };
type NavGroup = { label: string; icon: React.FC<{ className?: string }>; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Command Center',
    icon: Zap,
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { key: 'pipeline', label: 'Pipeline', icon: GitBranchPlus },
      { key: 'history', label: 'History', icon: ScrollText },
    ],
  },
  {
    label: 'Work',
    icon: Layers,
    items: [
      { key: 'work-queue', label: 'Work Queue', icon: ClipboardList },
      { key: 'agencies', label: 'Agencies', icon: Building2 },
      { key: 'roster', label: 'Rosters', icon: BookUser },
    ],
  },
  {
    label: 'Tools',
    icon: Wrench,
    items: [
      { key: 'contact-import', label: 'Contact Import', icon: Upload },
      { key: 'templates', label: 'Templates', icon: FileSpreadsheet },
      { key: 'testing', label: 'Testing', icon: FlaskConical },
    ],
  },
];

const AGENCY_STATUS_KEY = 'crm_selected_agency';
const CRM_SESSION_KEY = 'crm_authenticated';

function getAgencyStatusColor(agency: CrmAgency): string {
  if (agency.onboarding_status === 'onboarding_complete' && agency.is_active) return 'bg-emerald-400';
  if (agency.onboarding_status !== 'onboarding_complete') return 'bg-amber-400';
  return 'bg-steel-300';
}

const CrmPasswordGate: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'CRMBadasses!') {
      sessionStorage.setItem(CRM_SESSION_KEY, 'true');
      onSuccess();
    } else {
      setError('Incorrect password');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-lg border border-steel-200 p-8 w-full max-w-sm transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center mb-4 border border-navy-100">
            <ShieldCheck className="w-7 h-7 text-navy-600" />
          </div>
          <h2 className="text-xl font-bold text-steel-900">CRM Access</h2>
          <p className="text-sm text-steel-500 mt-1">Enter the team password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              autoFocus
              className="w-full pl-10 pr-4 py-3 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password}
            className="w-full bg-navy-600 text-white py-3 rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold disabled:opacity-40"
          >
            Enter CRM
          </button>
        </form>
      </div>
    </div>
  );
};

const AgencySelector: React.FC<{
  agencies: CrmAgency[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ agencies, selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = agencies.find(a => a.id === selectedId);
  const filtered = agencies.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-navy-800/50 border border-navy-600/30 rounded-lg text-left hover:bg-navy-700/50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-navy-300 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-white truncate">
          {selected ? selected.name : 'All Agencies'}
        </span>
        {selected && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getAgencyStatusColor(selected)}`} />
        )}
        <ChevronDown className={`w-4 h-4 text-navy-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-steel-200 shadow-xl z-50 overflow-hidden max-h-80">
            <div className="p-2 border-b border-steel-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agencies..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm border border-steel-200 rounded-lg focus:ring-2 focus:ring-navy-200 focus:border-navy-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-56">
              <button
                onClick={() => { onSelect(null); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-steel-50 transition-colors ${!selectedId ? 'bg-navy-50 text-navy-700 font-medium' : 'text-steel-700'}`}
              >
                <div className="w-2 h-2 rounded-full bg-steel-300" />
                All Agencies
              </button>
              {filtered.map(agency => (
                <button
                  key={agency.id}
                  onClick={() => { onSelect(agency.id); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-steel-50 transition-colors ${selectedId === agency.id ? 'bg-navy-50 text-navy-700 font-medium' : 'text-steel-700'}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getAgencyStatusColor(agency)}`} />
                  <span className="truncate">{agency.name}</span>
                  {agency.is_test && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">TEST</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const CrmTeam: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(CRM_SESSION_KEY) === 'true');
  const [activeView, setActiveView] = useState<CrmView>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(() => {
    return localStorage.getItem(AGENCY_STATUS_KEY) || null;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workQueueMode, setWorkQueueMode] = useState<'tickets' | 'onboarding'>('tickets');

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId) || null;

  const handleSelectAgency = useCallback((id: string | null) => {
    setSelectedAgencyId(id);
    if (id) {
      localStorage.setItem(AGENCY_STATUS_KEY, id);
    } else {
      localStorage.removeItem(AGENCY_STATUS_KEY);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [unreadRes, agencyRes] = await Promise.all([
        supabase.from('crm_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('crm_agencies').select('*').eq('is_active', true).eq('crm_enabled', true).order('name'),
      ]);
      setUnreadCount(unreadRes.count || 0);
      setAgencies(agencyRes.data || []);
    };
    loadData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <KpiDashboardTab key={`dashboard-${refreshKey}`} onNavigate={(tab) => setActiveView(tab as CrmView)} />;
      case 'agencies':
        return <AgenciesTab key={`agencies-${refreshKey}`} />;
      case 'work-queue':
        return workQueueMode === 'tickets'
          ? <TaskboardCurrentTab key={`tb-current-${refreshKey}`} />
          : <TaskboardOnboardingTab key={`tb-onboarding-${refreshKey}`} />;
      case 'pipeline':
        return <PipelineTab key={`pipeline-${refreshKey}`} />;
      case 'roster':
        return <RosterTab key={`roster-${refreshKey}`} />;
      case 'templates':
        return <TemplateManagementTab key={`templates-${refreshKey}`} />;
      case 'testing':
        return <TestingTab key={`testing-${refreshKey}`} />;
      case 'history':
        return <ActivityHistoryTab key={`history-${refreshKey}`} />;
      case 'contact-import':
        return <ContactImportTab key={`contact-import-${refreshKey}`} />;
      default:
        return null;
    }
  };

  if (!authenticated) {
    return <CrmPasswordGate onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 bg-navy-900 border-r border-navy-800 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        {/* Header */}
        <div className="px-4 py-5 border-b border-navy-800/50">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base font-bold text-white tracking-tight">CRM Team</h1>
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded-md text-navy-400 hover:text-white hover:bg-navy-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Agency Selector */}
          {!sidebarCollapsed && (
            <AgencySelector
              agencies={agencies}
              selectedId={selectedAgencyId}
              onSelect={handleSelectAgency}
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-1.5 px-2 mb-1.5">
                  <group.icon className="w-3 h-3 text-navy-500" />
                  <span className="text-[10px] font-semibold text-navy-500 uppercase tracking-wider">{group.label}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.key;
                  const showBadge = unreadCount > 0 && (item.key === 'dashboard' || item.key === 'work-queue');
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveView(item.key)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                        isActive
                          ? 'bg-navy-700 text-white shadow-sm'
                          : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {showBadge && (
                        <span className="absolute top-1 right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-red-500 text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer - Agency Quick Info */}
        {!sidebarCollapsed && selectedAgency && (
          <div className="px-3 py-3 border-t border-navy-800/50">
            <div className="bg-navy-800/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${getAgencyStatusColor(selectedAgency)}`} />
                <span className="text-xs font-semibold text-white truncate">{selectedAgency.name}</span>
              </div>
              <div className="space-y-1">
                {selectedAgency.assigned_csr && (
                  <p className="text-[11px] text-navy-300">CSR: {selectedAgency.assigned_csr}</p>
                )}
                <p className="text-[11px] text-navy-300">Seats: {selectedAgency.seat_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="px-4 py-3 border-t border-navy-800/50 text-navy-400 hover:text-white text-xs font-medium transition-colors"
        >
          {sidebarCollapsed ? '>>' : '<< Collapse'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-steel-50">
        {/* Content Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-steel-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-navy-800">
                {NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeView)?.label}
              </h2>
              {selectedAgency && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-navy-50 border border-navy-200 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${getAgencyStatusColor(selectedAgency)}`} />
                  <span className="text-xs font-medium text-navy-700">{selectedAgency.name}</span>
                  <button
                    onClick={() => handleSelectAgency(null)}
                    className="ml-0.5 text-navy-400 hover:text-navy-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Work Queue Toggle */}
            {activeView === 'work-queue' && (
              <div className="flex items-center bg-steel-100 rounded-lg p-0.5">
                <button
                  onClick={() => setWorkQueueMode('tickets')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    workQueueMode === 'tickets' ? 'bg-white shadow-sm text-navy-700' : 'text-steel-600 hover:text-navy-700'
                  }`}
                >
                  Tickets
                </button>
                <button
                  onClick={() => setWorkQueueMode('onboarding')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    workQueueMode === 'onboarding' ? 'bg-white shadow-sm text-navy-700' : 'text-steel-600 hover:text-navy-700'
                  }`}
                >
                  Onboarding
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
};
