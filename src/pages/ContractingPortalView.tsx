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
  Copy,
  Check as CheckIcon,
  FileSpreadsheet,
  LogOut,
  Clock,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency, AgencyIntakeSubmission } from '../lib/supabase';
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

// ─── Status badge helper ─────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: AgencyIntakeSubmission['status'] }> = ({ status }) => {
  if (status === 'approved')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />Approved
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
        <X className="w-3 h-3" />Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" />Pending
    </span>
  );
};

// ─── Add Sub-Agency Modal ─────────────────────────────────────────────────────

const AddSubAgencyModal: React.FC<{
  parentAgency: CrmAgency;
  onClose: () => void;
  onAdded: (agency: CrmAgency) => void;
}> = ({ parentAgency, onClose, onAdded }) => {
  const [name, setName] = useState('');
  const [agencyNpn, setAgencyNpn] = useState('');
  const [agencyEin, setAgencyEin] = useState('');
  const [principalAgent, setPrincipalAgent] = useState('');
  const [principalAgentNpn, setPrincipalAgentNpn] = useState('');
  const [contractingEmail, setContractingEmail] = useState('');
  const [contractingContact, setContractingContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Preview the slug as user types
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Agency name is required.'); return; }
    if (!agencyNpn.trim()) { setError('Agency NPN is required.'); return; }
    if (!agencyEin.trim()) { setError('Agency EIN is required.'); return; }
    if (!principalAgent.trim()) { setError('Principal Agent name is required.'); return; }
    if (!principalAgentNpn.trim()) { setError('Principal Agent NPN is required.'); return; }
    if (!contractingEmail.trim()) { setError('Contracting email is required.'); return; }
    if (!emailRegex.test(contractingEmail.trim())) { setError('Please enter a valid email.'); return; }

    setSubmitting(true);
    setError('');

    const portalPassword = `${name.trim()}CRMPortal!`;

    const { data, error: insertErr } = await supabase
      .from('hierarchy_agencies')
      .insert({
        name: name.trim(),
        agency_type: 'sub',
        parent_agency_id: parentAgency.id,
        onboarding_status: 'pending_csr_assignment',
        is_active: true,
        crm_enabled: false,
        slug,
        portal_password: portalPassword,
        date_created: new Date().toISOString().slice(0, 10),
        agency_npn: agencyNpn.trim() || null,
        agency_ein: agencyEin.trim() || null,
        principal_agent: principalAgent.trim() || null,
        principal_agent_npn: principalAgentNpn.trim() || null,
        contracting_email: contractingEmail.trim() || null,
        contracting_contact: contractingContact.trim() || null,
      })
      .select()
      .maybeSingle();

    setSubmitting(false);

    if (insertErr) {
      setError(insertErr.message.includes('23505')
        ? 'An agency with this name or slug already exists.'
        : insertErr.message);
      return;
    }
    if (data) onAdded(data as CrmAgency);
  };

  const Field: React.FC<{
    label: string; required?: boolean; value: string;
    onChange: (v: string) => void; placeholder?: string; half?: boolean;
  }> = ({ label, required, value, onChange, placeholder, half }) => (
    <div className={half ? '' : 'col-span-2'}>
      <label className="block text-xs font-medium text-steel-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setError(''); }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-steel-900">Add Sub-Agency</h3>
            <p className="text-xs text-steel-400 mt-0.5">
              Under <span className="font-medium text-steel-600">{parentAgency.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Agency name + slug preview */}
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="e.g. 360 Insurance Group"
              autoFocus
            />
            {slug && (
              <p className="text-xs text-steel-400 mt-1.5 font-mono">
                Portal URL: contracting.teamfym.com/agency/<span className="text-navy-600 font-semibold">{slug}</span>
              </p>
            )}
          </div>

          {/* Contracting details */}
          <div className="border-t border-steel-200 pt-4">
            <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-3">Contracting Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agency NPN" required value={agencyNpn} onChange={setAgencyNpn} placeholder="e.g. 12345678" half />
              <Field label="Agency EIN" required value={agencyEin} onChange={setAgencyEin} placeholder="e.g. 12-3456789" half />
              <Field label="Principal Agent" required value={principalAgent} onChange={setPrincipalAgent} placeholder="Full name" half />
              <Field label="Principal Agent NPN" required value={principalAgentNpn} onChange={setPrincipalAgentNpn} placeholder="e.g. 12345678" half />
              <Field label="Contracting Email" required value={contractingEmail} onChange={setContractingEmail} placeholder="email@agency.com" />
              <Field label="Contracting Contact" value={contractingContact} onChange={setContractingContact} placeholder="Name (optional)" />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-steel-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-steel-600 border border-steel-300 rounded-lg hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Add Agency'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Contracting Links Tab ────────────────────────────────────────────────────

const ContractingLinksTab: React.FC<{ agency: CrmAgency }> = ({ agency }) => {
  const [copied, setCopied] = useState(false);
  const [submissions, setSubmissions] = useState<AgencyIntakeSubmission[]>([]);
  const [subAgencies, setSubAgencies] = useState<CrmAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  const baseUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin;
  // Use slug for the invite link — readable, matches the format Charlie described
  const inviteUrl = `${baseUrl}/agency-intake?from=${agency.slug}&agency=${encodeURIComponent(agency.name)}`;

  const loadData = async () => {
    setLoading(true);
    const [subResult, subResult2] = await Promise.all([
      supabase
        .from('hierarchy_agencies')
        .select('*')
        .eq('parent_agency_id', agency.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('agency_intake_submissions')
        .select('*')
        .eq('invited_by_agency_name', agency.name)
        .order('created_at', { ascending: false }),
    ]);
    setSubAgencies((subResult.data ?? []) as CrmAgency[]);
    setSubmissions((subResult2.data ?? []) as AgencyIntakeSubmission[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [agency.id]);

  const copyUrl = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {showAddModal && (
        <AddSubAgencyModal
          parentAgency={agency}
          onClose={() => setShowAddModal(false)}
          onAdded={(newAgency) => {
            setSubAgencies((prev) => [...prev, newAgency].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAddModal(false);
          }}
        />
      )}

      {/* Header + Add button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-steel-900">Sub-Agencies</h2>
          <p className="text-sm text-steel-500 mt-0.5">
            Add agencies in your direct downline or share your intake link so they can apply.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-navy-700 hover:bg-navy-800 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Agency
        </button>
      </div>

      {/* Invite link card */}
      <div className="bg-white rounded-xl border border-steel-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-4 h-4 text-steel-400" />
          <p className="text-xs font-semibold text-steel-700 uppercase tracking-wide">Agency Intake Link</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-steel-50 border border-steel-200 rounded-lg px-3 py-2">
            <p className="text-xs font-mono text-steel-600 truncate">{inviteUrl}</p>
          </div>
          <button
            onClick={copyUrl}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-navy-700 text-white hover:bg-navy-800'
            }`}
          >
            {copied ? <><CheckIcon className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
        <p className="text-xs text-steel-400 mt-2">
          Share this link with agencies contracting under you — every submission is tied to {agency.name}.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-600" />
        </div>
      ) : (
        <>
          {/* Direct sub-agencies */}
          <div>
            <p className="text-sm font-semibold text-steel-900 mb-3">
              Direct Sub-Agencies
              <span className="ml-2 text-xs font-normal text-steel-400">{subAgencies.length}</span>
            </p>
            {subAgencies.length === 0 ? (
              <div className="bg-white rounded-xl border border-steel-200 px-6 py-8 text-center">
                <Building2 className="w-7 h-7 text-steel-300 mx-auto mb-2" />
                <p className="text-sm text-steel-500">No sub-agencies yet.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 text-xs text-navy-600 hover:text-navy-800 font-medium underline"
                >
                  Add the first one
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {subAgencies.map((sub) => (
                  <div key={sub.id} className="bg-white rounded-xl border border-steel-200 px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-steel-900 truncate">{sub.name}</p>
                      <p className="text-xs text-steel-400 font-mono mt-0.5">
                        /agency/<span className="text-navy-600">{sub.slug}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        sub.crm_enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-steel-100 text-steel-500'
                      }`}>
                        {sub.crm_enabled ? 'CRM On' : 'CRM Off'}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        sub.onboarding_status === 'onboarding_complete'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sub.onboarding_status === 'onboarding_complete' ? 'Active' : 'Onboarding'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intake submissions */}
          <div>
            <p className="text-sm font-semibold text-steel-900 mb-3">
              Intake Submissions
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-800">
                  {pendingCount} pending
                </span>
              )}
              <span className="ml-2 text-xs font-normal text-steel-400">{submissions.length} total</span>
            </p>
            {submissions.length === 0 ? (
              <div className="bg-white rounded-xl border border-steel-200 px-6 py-8 text-center">
                <Users className="w-7 h-7 text-steel-300 mx-auto mb-2" />
                <p className="text-sm text-steel-500">No intake submissions yet.</p>
                <p className="text-xs text-steel-400 mt-1">Share your intake link above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => {
                  const isOpen = expanded.has(s.id);
                  return (
                    <div key={s.id} className="bg-white rounded-xl border border-steel-200 overflow-hidden">
                      <button
                        onClick={() => toggleExpand(s.id)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-steel-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-steel-900 truncate">{s.agency_name}</p>
                          <p className="text-xs text-steel-400 mt-0.5">
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={s.status} />
                          {isOpen ? <ChevronUp className="w-4 h-4 text-steel-400" /> : <ChevronDown className="w-4 h-4 text-steel-400" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-steel-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
                            {([
                              ['Agency NPN', s.agency_npn],
                              ['Agency EIN', s.agency_ein],
                              ['Principal Agent', s.principal_agent],
                              ['Principal NPN', s.principal_agent_npn],
                              ['Contracting Email', s.contracting_email],
                              s.contracting_contact ? ['Contracting Contact', s.contracting_contact] : null,
                              (s.street_address || s.city || s.state) ? ['Address', [s.street_address, s.city, s.state, s.zip].filter(Boolean).join(', ')] : null,
                            ] as (string[] | null)[])
                              .filter(Boolean)
                              .map((pair) => { const [label, value] = pair as string[]; return (
                                <div key={label}>
                                  <p className="text-[10px] font-semibold text-steel-400 uppercase mb-0.5">{label}</p>
                                  <p className="text-steel-700">{value}</p>
                                </div>
                              ); })}
                          </div>
                          {(s.additional_contacts ?? []).length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] font-semibold text-steel-400 uppercase mb-1">Additional Contacts</p>
                              {s.additional_contacts.map((c, ci) => (
                                <p key={ci} className="text-xs text-steel-600">
                                  <span className="font-medium">{c.name}</span>
                                  {c.title && ` · ${c.title}`}
                                  {c.department && ` (${c.department})`}
                                  {c.email && ` · ${c.email}`}
                                  {c.phone && ` · ${c.phone}`}
                                </p>
                              ))}
                            </div>
                          )}
                          {s.status === 'pending' && (
                            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              Under review by the FYM contracting team.
                            </p>
                          )}
                          {s.status === 'rejected' && s.review_note && (
                            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              <span className="font-semibold">Note:</span> {s.review_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
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
