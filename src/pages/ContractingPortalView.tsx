import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Lock,
  ShieldCheck,
  Upload,
  Users,
  Monitor,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Copy,
  Check as CheckIcon,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';
import { parseCSV } from '../lib/csvParser';
import { normalizeRosterRows, ROSTER_TEMPLATE_HEADERS, CANONICAL_ROSTER_HEADERS } from '../lib/rosterNormalizer';

/**
 * Contracting Portal — /agency/:slug
 *
 * Purpose-built view for parent agencies (agencies direct to FYM).
 * Three functions:
 *   1. Upload agent roster
 *   2. Send contracting links to direct downline agents
 *   3. CRM opt-in → modal directing them to email will@teamfym.com
 *
 * Auth: password-gated using hierarchy_agencies.portal_password (same as AgencyPortal).
 * Completely separate from the CRM portal at /:slug.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'roster' | 'contracting' | 'crm';

const FORM_TYPES = [
  { value: 'hip', label: 'HIP', path: '/hip' },
  { value: 'hip-career', label: 'HIP Career', path: '/hip-career' },
  { value: 'hip-broker', label: 'HIP Broker', path: '/hip-broker' },
  { value: 'life-only', label: 'Life Only', path: '/life' },
  { value: 'field', label: 'Field', path: '/field' },
  { value: 'direct-pay', label: 'Direct Pay (Telesales)', path: '/direct-pay' },
  { value: 'telesales', label: 'Telesales', path: '/telesales' },
];

// ─── Password Gate ─────────────────────────────────────────────────────────────

const PasswordGate: React.FC<{ agencyName: string; onSuccess: () => void }> = ({
  agencyName,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    const { data } = await supabase
      .from('hierarchy_agencies')
      .select('portal_password')
      .eq('name', agencyName)
      .maybeSingle();

    if (data?.portal_password === password) {
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
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-steel-200 p-8 w-full max-w-sm transition-transform ${
          shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center mb-4 border border-navy-100">
            <ShieldCheck className="w-7 h-7 text-navy-600" />
          </div>
          <h2 className="text-xl font-bold text-steel-900 text-center">{agencyName}</h2>
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
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={checking || !password}
            className="w-full py-3 bg-navy-700 text-white rounded-lg font-semibold text-sm hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── CRM Opt-in Modal ─────────────────────────────────────────────────────────

const CrmOptInModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="px-6 py-5 border-b border-steel-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-navy-600" />
          </div>
          <h3 className="text-lg font-bold text-steel-900">Get CRM Access</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-steel-400" />
        </button>
      </div>
      <div className="px-6 py-6 space-y-4">
        <p className="text-sm text-steel-700 leading-relaxed">
          The FYM CRM gives your agency automated retention messaging, cancellation management,
          cross-sell campaigns, and a dedicated CSR — all running in the background so your agents
          can focus on writing business.
        </p>
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-navy-900 mb-1">To get started:</p>
          <p className="text-sm text-navy-700">
            Email{' '}
            <a
              href="mailto:will@teamfym.com"
              className="font-bold underline hover:text-navy-900"
            >
              will@teamfym.com
            </a>{' '}
            and let him know you're interested in CRM access for your agency.
          </p>
        </div>
        <p className="text-xs text-steel-400">
          CRM onboarding is managed directly by Will. He'll walk you through setup and get your
          agency connected.
        </p>
      </div>
      <div className="px-6 pb-5">
        <a
          href="mailto:will@teamfym.com?subject=CRM Access Request"
          className="block w-full text-center py-3 bg-navy-700 text-white rounded-xl font-semibold text-sm hover:bg-navy-800 transition-colors"
        >
          Email Will Now
        </a>
      </div>
    </div>
  </div>
);

// ─── Roster Tab ────────────────────────────────────────────────────────────────

const RosterTab: React.FC<{ agency: CrmAgency }> = ({ agency }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [hasExisting, setHasExisting] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    supabase
      .from('crm_roster_uploads')
      .select('id, row_count')
      .eq('agency', agency.name)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasExisting(true);
          setExistingCount(data[0].row_count || 0);
        }
      });
  }, [agency.name]);

  const downloadTemplate = () => {
    const header = ROSTER_TEMPLATE_HEADERS.join(',');
    const blob = new Blob([header + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent_roster_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const text = await file.text();
      const { rows: rawRows } = parseCSV(text);
      const { rows: normalizedRows } = normalizeRosterRows(
        rawRows,
        agency.crm_number ?? ''
      );

      if (normalizedRows.length === 0) {
        setUploadError('No valid rows found. Check the file format and try again.');
        setUploading(false);
        return;
      }

      // Delete previous upload for this agency
      const { data: existing } = await supabase
        .from('crm_roster_uploads')
        .select('id')
        .eq('agency', agency.name)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from('crm_roster').delete().eq('upload_id', existing.id);
        await supabase.from('crm_roster_uploads').delete().eq('id', existing.id);
      }

      const { data: upload, error: uploadErr } = await supabase
        .from('crm_roster_uploads')
        .insert({
          agency: agency.name,
          file_name: file.name,
          row_count: normalizedRows.length,
          headers: CANONICAL_ROSTER_HEADERS,
        })
        .select()
        .single();

      if (uploadErr || !upload) throw new Error(uploadErr?.message || 'Upload failed');

      const BATCH = 100;
      for (let i = 0; i < normalizedRows.length; i += BATCH) {
        const batch = normalizedRows.slice(i, i + BATCH).map((r: Record<string, string>) => ({
          upload_id: upload.id,
          row_data: r,
        }));
        await supabase.from('crm_roster').insert(batch);
      }

      // Notify CRM team
      await supabase.from('crm_notifications').insert({
        agency_id: agency.id,
        type: 'roster_uploaded',
        message: `${agency.name} uploaded their agent roster (${normalizedRows.length} agents) via contracting portal — action required`,
      });

      setHasExisting(true);
      setExistingCount(normalizedRows.length);
      setUploadSuccess(`${normalizedRows.length} agents uploaded successfully.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-steel-900">Agent Roster</h2>
        <p className="text-sm text-steel-500 mt-0.5">
          Upload your agency's agent roster so the FYM team can set up your account.
        </p>
      </div>

      {hasExisting && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">{existingCount} agents</span> on file.
            Upload a new file below to replace it.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-steel-900">Upload Agent Roster</p>
            <p className="text-xs text-steel-500 mt-0.5">
              CSV file with First Name, Last Name, Email, Phone, Agent NPN, Gender
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-800 font-medium flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download template
          </button>
        </div>

        <label className="block">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              uploading
                ? 'border-steel-200 bg-steel-50 cursor-not-allowed'
                : 'border-steel-300 hover:border-navy-400 hover:bg-navy-50/30'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
                <p className="text-sm text-steel-500">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6 text-navy-500" />
                </div>
                <p className="text-sm font-medium text-steel-700">
                  Click to select your roster CSV
                </p>
                <p className="text-xs text-steel-400">CSV files only</p>
              </div>
            )}
          </div>
        </label>

        {uploadError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {uploadSuccess}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Contracting Links Tab ────────────────────────────────────────────────────

const ContractingLinksTab: React.FC<{ agency: CrmAgency }> = ({ agency }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const baseUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-steel-900">Contracting Links</h2>
        <p className="text-sm text-steel-500 mt-0.5">
          Send these links to agents in your downline to start their contracting process.
          Each form is tied to your agency.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-steel-200 divide-y divide-steel-100">
        {FORM_TYPES.map((ft) => {
          const url = `${baseUrl}${ft.path}?agency=${encodeURIComponent(agency.name)}`;
          const key = ft.value;
          return (
            <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-steel-900">{ft.label}</p>
                <p className="text-xs text-steel-400 font-mono truncate mt-0.5">{url}</p>
              </div>
              <button
                onClick={() => copy(url, key)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-steel-200 hover:border-navy-400 hover:text-navy-700 transition-colors flex-shrink-0"
              >
                {copiedKey === key ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-steel-50 border border-steel-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Send className="w-4 h-4 text-steel-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-steel-600">
          Copy the link for the product your agent is contracting for and send it directly — via
          text, email, or whatever your team uses. The form pre-fills your agency name so
          contracting knows where each submission belongs.
        </p>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ContractingPortalView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [agency, setAgency] = useState<CrmAgency | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [showCrmModal, setShowCrmModal] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    // Check session
    const sessionKey = `contracting_portal_${slug}_auth`;
    if (sessionStorage.getItem(sessionKey) === 'true') setAuthenticated(true);

    supabase
      .from('hierarchy_agencies')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setAgency(data as CrmAgency);
        setLoading(false);
      });
  }, [slug]);

  const handleAuthSuccess = () => {
    sessionStorage.setItem(`contracting_portal_${slug}_auth`, 'true');
    setAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`contracting_portal_${slug}_auth`);
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-steel-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (notFound || !agency) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal Not Found</h2>
          <p className="text-gray-500 text-sm">
            This agency portal doesn't exist or is no longer active.
            Contact{' '}
            <a href="mailto:Contracting@teamfym.com" className="text-navy-600 underline">
              Contracting@teamfym.com
            </a>{' '}
            if you think this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <PasswordGate agencyName={agency.name} onSuccess={handleAuthSuccess} />;
  }

  const tabs: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'roster', label: 'Agent Roster', icon: Upload },
    { key: 'contracting', label: 'Contracting Links', icon: Users },
    { key: 'crm', label: 'CRM Access', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-steel-50">
      {showCrmModal && <CrmOptInModal onClose={() => setShowCrmModal(false)} />}

      {/* Header */}
      <div className="bg-white border-b border-steel-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-navy-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-steel-900 truncate">{agency.name}</p>
              <p className="text-xs text-steel-400">FYM Contracting Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-steel-500 hover:text-steel-700 transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex border-t border-steel-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === 'crm') { setShowCrmModal(true); return; }
                setActiveTab(tab.key);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key && tab.key !== 'crm'
                  ? 'border-navy-600 text-navy-700'
                  : 'border-transparent text-steel-500 hover:text-steel-700 hover:bg-steel-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'crm' && (
                <span className="text-[9px] font-bold text-navy-600 bg-navy-100 px-1.5 py-0.5 rounded uppercase ml-0.5">
                  Opt in
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'roster' && <RosterTab agency={agency} />}
        {activeTab === 'contracting' && <ContractingLinksTab agency={agency} />}
      </div>
    </div>
  );
};
