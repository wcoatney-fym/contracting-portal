import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Lock, ShieldCheck, BarChart3, Users, MessageSquareText, Headphones as HeadphonesIcon, LogOut, AlertCircle, BookOpen, Clock, Upload, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';
import { PortalDashboardTab } from './portal/PortalDashboardTab';
import { PortalAgentsTab } from './portal/PortalAgentsTab';
import { PortalTicketsTab } from './portal/PortalTicketsTab';
import { PortalCsrTab } from './portal/PortalCsrTab';
import { PortalOnboardingView } from './portal/PortalOnboardingView';
import { PortalBookTab } from './portal/PortalBookTab';
import { PortalCancellationsTab } from './portal/PortalCancellationsTab';
import { PortalCrossSellTab } from './portal/PortalCrossSellTab';
import { AgencyFilter } from './portal/AgencyFilter';

type PortalTab = 'dashboard' | 'agents' | 'book' | 'cancellations' | 'cross-sell' | 'tickets' | 'csr';

const TAB_ITEMS: { key: PortalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'agents', label: 'Agent Management', icon: Users },
  { key: 'book', label: 'Book of Business', icon: BookOpen },
  { key: 'cancellations', label: 'Cancellation Upload', icon: Upload },
  { key: 'cross-sell', label: 'Cross-Sell', icon: Package },
  { key: 'tickets', label: 'Support', icon: MessageSquareText },
  { key: 'csr', label: 'CSR Contact', icon: HeadphonesIcon },
];

const PortalPasswordGate: React.FC<{
  agencyName: string;
  onSuccess: () => void;
}> = ({ agencyName, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');

    const { data } = await supabase
      .from('crm_agencies')
      .select('portal_password')
      .eq('name', agencyName)
      .maybeSingle();

    if (data && data.portal_password === password) {
      onSuccess();
    } else {
      setError('Incorrect password');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl border border-steel-200 p-8 w-full max-w-sm transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center mb-4 border border-navy-100">
            <ShieldCheck className="w-7 h-7 text-navy-600" />
          </div>
          <h2 className="text-xl font-bold text-steel-900">{agencyName}</h2>
          <p className="text-sm text-steel-500 mt-1">Enter your agency password to continue</p>
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

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={!password || checking}
            className="w-full bg-navy-600 text-white py-3 rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold disabled:opacity-40"
          >
            {checking ? 'Checking...' : 'Enter Portal'}
          </button>
        </form>

        <p className="text-xs text-steel-400 text-center mt-6">
          Powered by FYM Financial CRM
        </p>
      </div>
    </div>
  );
};

const PortalNotFound: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl border border-steel-200 p-10 w-full max-w-md text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-steel-900 mb-2">Portal Not Found</h2>
      <p className="text-steel-500 text-sm mb-6">
        The agency portal you're looking for doesn't exist or is no longer active.
      </p>
      <p className="text-xs text-steel-400">
        If you believe this is an error, contact your administrator or email Contracting@teamFYM.com
      </p>
    </div>
  </div>
);

const ComingSoonOverlay: React.FC = () => (
  <div className="relative min-h-[400px] rounded-xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-steel-100 to-steel-200 blur-sm" />
    <div className="absolute inset-0 backdrop-blur-sm bg-white/40" />
    <div className="relative flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-steel-200 flex items-center justify-center mb-5">
        <Clock className="w-7 h-7 text-navy-600" />
      </div>
      <h3 className="text-xl font-bold text-steel-900 mb-2">Coming Soon</h3>
      <p className="text-steel-600 text-sm max-w-sm">
        This feature is being set up for your agency. Check back soon for updates.
      </p>
    </div>
  </div>
);

export const AgencyPortal: React.FC = () => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '').split('/')[0] || null;
  const [agency, setAgency] = useState<CrmAgency | null>(null);
  const [childAgencies, setChildAgencies] = useState<CrmAgency[]>([]);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');

  const allAgencies = agency ? [agency, ...childAgencies] : [];
  const selectedAgencyNames = allAgencies
    .filter(a => selectedAgencyIds.includes(a.id))
    .map(a => a.name);
  const hiddenTabs = agency?.portal_hidden_tabs || [];

  useEffect(() => {
    if (agency && hiddenTabs.includes(activeTab)) {
      const firstVisible = TAB_ITEMS.find(t => !hiddenTabs.includes(t.key));
      if (firstVisible) setActiveTab(firstVisible.key);
    }
  }, [agency]);

  const fetchAgency = useCallback(async () => {
    if (!slug) return;
    const { data } = await supabase
      .from('crm_agencies')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      setAgency(data);
      const { data: children } = await supabase
        .from('crm_agencies')
        .select('*')
        .eq('parent_agency_id', data.id)
        .eq('is_active', true)
        .order('name');
      const kids = children || [];
      setChildAgencies(kids);
      setSelectedAgencyIds([data.id, ...kids.map(c => c.id)]);
    }
  }, [slug]);

  useEffect(() => {
    const loadAgency = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('crm_agencies')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!data) {
        setNotFound(true);
      } else {
        setAgency(data);

        const { data: children } = await supabase
          .from('crm_agencies')
          .select('*')
          .eq('parent_agency_id', data.id)
          .eq('is_active', true)
          .order('name');
        const kids = children || [];
        setChildAgencies(kids);
        setSelectedAgencyIds([data.id, ...kids.map(c => c.id)]);

        const sessionKey = `portal_${slug}_auth`;
        if (sessionStorage.getItem(sessionKey) === 'true') {
          setAuthenticated(true);
        }
      }
      setLoading(false);
    };
    loadAgency();
  }, [slug]);

  const handleAuth = () => {
    sessionStorage.setItem(`portal_${slug}_auth`, 'true');
    setAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`portal_${slug}_auth`);
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-400" />
      </div>
    );
  }

  if (notFound || !agency) return <PortalNotFound />;

  if (!authenticated) {
    return <PortalPasswordGate agencyName={agency.name} onSuccess={handleAuth} />;
  }

  const isOnboarding = agency.onboarding_status !== 'onboarding_complete';
  const hasChildren = childAgencies.length > 0;

  return (
    <div className="min-h-screen bg-steel-50">
      <header className="bg-navy-900 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center border border-navy-600">
                <Building2 className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{agency.name}</h1>
                <p className="text-[11px] text-gold-400 -mt-0.5">
                  {hasChildren ? `${childAgencies.length + 1} agencies` : 'Agency Portal'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-steel-300 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {isOnboarding ? (
          <PortalOnboardingView agency={agency} onRefresh={fetchAgency} />
        ) : (
          <>
            <div className="flex items-center gap-1 bg-white border border-steel-200 rounded-xl p-1.5 mb-4 overflow-x-auto shadow-sm">
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-navy-600 text-white shadow-sm'
                        : 'text-steel-600 hover:bg-steel-100 hover:text-navy-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {hasChildren && (
              <AgencyFilter
                agencies={allAgencies}
                selectedIds={selectedAgencyIds}
                onChange={setSelectedAgencyIds}
              />
            )}

            <div className="pb-8 relative">
              {hiddenTabs.includes(activeTab) ? (
                <ComingSoonOverlay />
              ) : (
                <>
                  {activeTab === 'dashboard' && (
                    <PortalDashboardTab
                      agency={agency}
                      agencyIds={selectedAgencyIds}
                      agencyNames={selectedAgencyNames}
                    />
                  )}
                  {activeTab === 'agents' && (
                    <PortalAgentsTab
                      agency={agency}
                      agencyIds={selectedAgencyIds}
                      agencyNames={selectedAgencyNames}
                    />
                  )}
                  {activeTab === 'book' && (
                    <PortalBookTab
                      agency={agency}
                      agencyIds={selectedAgencyIds}
                      agencyNames={selectedAgencyNames}
                    />
                  )}
                  {activeTab === 'cancellations' && (
                    <PortalCancellationsTab
                      agency={agency}
                      agencyIds={selectedAgencyIds}
                    />
                  )}
                  {activeTab === 'cross-sell' && (
                    <PortalCrossSellTab agencyIds={selectedAgencyIds} agencies={allAgencies.filter(a => selectedAgencyIds.includes(a.id))} />
                  )}
                  {activeTab === 'tickets' && (
                    <PortalTicketsTab
                      agency={agency}
                      agencyIds={selectedAgencyIds}
                    />
                  )}
                  {activeTab === 'csr' && <PortalCsrTab agency={agency} onRefresh={fetchAgency} />}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
