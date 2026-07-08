import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const INTAKE_URL = `${SUPABASE_URL}/functions/v1/agency-intake-submit`;

type ParentAgency = {
  id: string;
  name: string;
  agency_type: string | null;
  parent_agency_id: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AgencyIntake: React.FC = () => {
  const [parents, setParents] = useState<ParentAgency[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [agencyNpn, setAgencyNpn] = useState('');
  const [agencyEin, setAgencyEin] = useState('');
  const [principalAgent, setPrincipalAgent] = useState('');
  const [principalAgentNpn, setPrincipalAgentNpn] = useState('');
  const [contractingEmail, setContractingEmail] = useState('');
  const [contractingContact, setContractingContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(INTAKE_URL, {
          method: 'GET',
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Apikey: SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          const list: ParentAgency[] = data.agencies || [];
          setParents(list);
          const root = list.find((a) => a.agency_type === 'main');
          if (root) setParentId(root.id);
        }
      } catch {
        // dropdown will simply be empty; submit still validates parent server-side
      } finally {
        if (!cancelled) setLoadingParents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ordered, indented parent list (root main agency first, children nested).
  const flatParents = (() => {
    const result: { agency: ParentAgency; indent: number }[] = [];
    const root = parents.find((a) => a.agency_type === 'main');
    const addNode = (id: string, depth: number) => {
      const a = parents.find((ag) => ag.id === id);
      if (!a) return;
      result.push({ agency: a, indent: depth });
      parents
        .filter((ag) => ag.parent_agency_id === id)
        .sort((x, y) => x.name.localeCompare(y.name))
        .forEach((child) => addNode(child.id, depth + 1));
    };
    if (root) addNode(root.id, 0);
    // Any agencies not reachable from the root (defensive) get appended flat.
    parents
      .filter((a) => !result.some((r) => r.agency.id === a.id))
      .forEach((a) => result.push({ agency: a, indent: 0 }));
    return result;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Agency name is required.'); return; }
    if (!parentId) { setError('Select a parent agency.'); return; }
    if (!agencyNpn.trim()) { setError('Agency NPN is required.'); return; }
    if (!agencyEin.trim()) { setError('Agency EIN is required.'); return; }
    if (!principalAgent.trim()) { setError('Principal Agent name is required.'); return; }
    if (!principalAgentNpn.trim()) { setError('Principal Agent NPN is required.'); return; }
    if (!contractingEmail.trim()) { setError('Contracting email is required.'); return; }
    if (!EMAIL_RE.test(contractingEmail.trim())) { setError('Please enter a valid email address.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(INTAKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: name.trim(),
          parentId,
          agencyNpn: agencyNpn.trim(),
          agencyEin: agencyEin.trim(),
          principalAgent: principalAgent.trim(),
          principalAgentNpn: principalAgentNpn.trim(),
          contractingEmail: contractingEmail.trim(),
          contractingContact: contractingContact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }
      setSubmittedName(name.trim());
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (submittedName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agency Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            <span className="font-medium text-gray-700">{submittedName}</span> has been submitted for
            contracting. Our team will pick it up from the portal and begin onboarding.
          </p>
          <button
            onClick={() => {
              setSubmittedName(null);
              setName(''); setAgencyNpn(''); setAgencyEin('');
              setPrincipalAgent(''); setPrincipalAgentNpn('');
              setContractingEmail(''); setContractingContact('');
            }}
            className="px-4 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700"
          >
            Submit Another Agency
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-lg my-8">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">New Agency Intake</h1>
            <p className="text-xs text-gray-500">Submit an agency for contracting</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="New agency name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Agency <span className="text-red-500">*</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={loadingParents}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-navy-500 focus:border-transparent disabled:opacity-60"
            >
              {loadingParents && <option value="">Loading agencies...</option>}
              {!loadingParents && flatParents.length === 0 && <option value="">No agencies available</option>}
              {flatParents.map(({ agency, indent }) => (
                <option key={agency.id} value={agency.id}>
                  {'\u00A0\u00A0'.repeat(indent)}{indent > 0 ? '-- ' : ''}{agency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contracting Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Agency NPN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={agencyNpn}
                  onChange={(e) => { setAgencyNpn(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 12345678"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Agency EIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={agencyEin}
                  onChange={(e) => { setAgencyEin(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 12-3456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Principal Agent <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={principalAgent}
                  onChange={(e) => { setPrincipalAgent(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Principal Agent NPN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={principalAgentNpn}
                  onChange={(e) => { setPrincipalAgentNpn(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 87654321"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contracting Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contractingEmail}
                  onChange={(e) => { setContractingEmail(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contracting Contact</label>
                <input
                  type="text"
                  value={contractingContact}
                  onChange={(e) => { setContractingContact(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="If applicable"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Agency'}
          </button>
        </form>
      </div>
    </div>
  );
};
