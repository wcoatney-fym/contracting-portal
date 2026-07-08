import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './pages/Dashboard';
import { AgentIntake } from './pages/AgentIntake';
import { AgentTracking } from './pages/AgentTracking';
import { AgentDatabase } from './pages/AgentDatabase';
import { AgentPipeline } from './pages/AgentPipeline';
import { CrmTeam } from './pages/CrmTeam';
import { Hierarchy } from './pages/Hierarchy';
import { LifeOnly } from './pages/forms/LifeOnly';
import { Field } from './pages/forms/Field';
import { DirectPay } from './pages/forms/DirectPay';
import { Telesales } from './pages/forms/Telesales';
import { HIP } from './pages/forms/HIP';
import { ThankYou } from './pages/ThankYou';
import { FymAgentResources } from './pages/FymAgentResources';
import { AgencyIntake } from './pages/AgencyIntake';
import { AgencyPortal } from './pages/AgencyPortal';
import { supabase } from './lib/supabase';
import { AlertCircle } from 'lucide-react';

const KNOWN_PATHS = new Set([
  '', 'dashboard', 'agent-intake', 'new-hires', 'populate-form', 'populate',
  'agent-tracking', 'agent-database', 'agent-pipeline', 'hierarchy', 'crm-team', 'crm',
  'fym-agent-resources',
]);

const ProtectedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [portalSlug, setPortalSlug] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugChecked, setSlugChecked] = useState(false);

  const pathSegments = location.pathname.replace(/^\//, '').split('/');
  const isSingleSegment = pathSegments.length === 1 && pathSegments[0] !== '';
  const potentialSlug = isSingleSegment ? pathSegments[0] : null;
  const isKnownPath = potentialSlug ? KNOWN_PATHS.has(potentialSlug) : true;

  useEffect(() => {
    if (!potentialSlug || isKnownPath) {
      setPortalSlug(null);
      setSlugChecked(true);
      return;
    }

    let cancelled = false;
    setCheckingSlug(true);
    setSlugChecked(false);

    Promise.resolve(
      supabase
      .from('crm_agencies')
      .select('slug')
      .eq('slug', potentialSlug)
      .eq('is_active', true)
      .maybeSingle()
    )
      .then(({ data }) => {
        if (cancelled) return;
        setPortalSlug(data ? data.slug : null);
        setCheckingSlug(false);
        setSlugChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPortalSlug(null);
        setCheckingSlug(false);
        setSlugChecked(true);
      });

    return () => { cancelled = true; };
  }, [potentialSlug, isKnownPath]);

  if (potentialSlug && !isKnownPath && (!slugChecked || checkingSlug)) {
    return (
      <div className="flex items-center justify-center h-screen bg-steel-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (portalSlug) {
    return <AgencyPortal />;
  }

  if (potentialSlug && !isKnownPath && slugChecked && !portalSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            The agency portal you're looking for doesn't exist or is no longer active.
          </p>
          <p className="text-xs text-gray-400">
            If you believe this is an error, contact your administrator or email Contracting@teamFYM.com
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-steel-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="agent-intake" element={<AgentIntake />} />
        <Route path="new-hires" element={<AgentIntake />} />
        <Route path="populate-form" element={<AgentIntake />} />
        <Route path="populate" element={<AgentIntake />} />
        <Route path="agent-tracking" element={<AgentTracking />} />
        <Route path="agent-database" element={<AgentDatabase />} />
        <Route path="agent-pipeline" element={<AgentPipeline />} />
        <Route path="hierarchy" element={<Hierarchy />} />
        <Route path="crm-team" element={<CrmTeam />} />
        <Route path="crm" element={<CrmTeam />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/life" element={<LifeOnly />} />
          <Route path="/field" element={<Field />} />
          <Route path="/direct-pay" element={<DirectPay />} />
          <Route path="/telesales" element={<Telesales />} />
          <Route path="/hip" element={<HIP />} />
          <Route path="/hip-career" element={<HIP />} />
          <Route path="/hip-broker" element={<HIP />} />
          <Route path="/field-hip" element={<HIP />} />
          <Route path="/direct-pay-hip" element={<HIP />} />
          <Route path="/telesales-hip" element={<HIP />} />
          <Route path="/agency-intake" element={<AgencyIntake />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/fym-agent-resources" element={<FymAgentResources />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
