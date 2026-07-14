import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Plus, Trash2 } from 'lucide-react';
import { supabase, US_STATES } from '../lib/supabase';
import { fireAgencyIntakeAlert } from '../lib/webhooks';
import type { AgencyContact } from '../lib/supabase';

/**
 * Public, unauthenticated agency intake form.
 *
 * Route: /agency-intake  (no login gate — handed to the contracting team as a link).
 *
 * Parent agency mapping is handled internally during approval — the public form
 * never selects a parent. However, a parent agency CAN send a personalised link
 * to their sub-agencies: /agency-intake?from=<agency_id>&agency=<Agency+Name>
 * In that case we store invited_by_agency_id + invited_by_agency_name so the
 * CRM team can see which agency initiated the intake.
 *
 * On submit: writes a `pending` row into `agency_intake_submissions` (anon INSERT
 * only, per RLS). Never touches `hierarchy_agencies` directly.
 */

type ContactField = keyof AgencyContact;

const EMPTY_CONTACT: AgencyContact = {
  name: '',
  title: '',
  department: '',
  email: '',
  phone: '',
};

export const AgencyIntake: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from') || null;
  const invitedByAgencyName = searchParams.get('agency')
    ? decodeURIComponent(searchParams.get('agency')!)
    : null;

  // `from` can be either a UUID (legacy) or a slug (new contracting portal links).
  // Resolve slug -> id on mount so invited_by_agency_id is always a valid UUID.
  const [invitedByAgencyId, setInvitedByAgencyId] = useState<string | null>(fromParam);
  useEffect(() => {
    if (!fromParam) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromParam);
    if (isUuid) return; // already a UUID
    // It's a slug — resolve to id
    supabase
      .from('hierarchy_agencies')
      .select('id')
      .eq('slug', fromParam)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setInvitedByAgencyId(data.id);
      });
  }, [fromParam]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    agencyName: '',
    agencyNpn: '',
    agencyEin: '',
    principalAgent: '',
    principalAgentNpn: '',
    contractingEmail: '',
    contractingContact: '',
    // Address
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
  });

  const [additionalContacts, setAdditionalContacts] = useState<AgencyContact[]>([]);

  const setField = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Additional contacts helpers ──────────────────────────────────────────────
  const addContact = () => setAdditionalContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);

  const removeContact = (i: number) =>
    setAdditionalContacts((prev) => prev.filter((_, idx) => idx !== i));

  const setContactField = (i: number, field: ContactField) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) =>
    setAdditionalContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: e.target.value } : c))
    );

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const agencyName = form.agencyName.trim();
    if (!agencyName) return setError('Agency Name is required.');
    if (!form.agencyNpn.trim()) return setError('Agency NPN is required.');
    if (!form.agencyEin.trim()) return setError('Agency EIN is required.');
    if (!form.principalAgent.trim()) return setError('Principal Agent is required.');
    if (!form.principalAgentNpn.trim()) return setError('Principal Agent NPN is required.');
    if (!form.contractingEmail.trim()) return setError('Contracting Email is required.');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contractingEmail.trim());
    if (!emailOk) return setError('Please enter a valid Contracting Email.');

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from('agency_intake_submissions')
      .insert({
        agency_name: agencyName,
        agency_npn: form.agencyNpn.trim(),
        agency_ein: form.agencyEin.trim(),
        principal_agent: form.principalAgent.trim(),
        principal_agent_npn: form.principalAgentNpn.trim(),
        contracting_email: form.contractingEmail.trim(),
        contracting_contact: form.contractingContact.trim() || null,
        street_address: form.streetAddress.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        zip: form.zip.trim() || null,
        additional_contacts: additionalContacts.filter((c) => c.name.trim()),
        invited_by_agency_id: invitedByAgencyId,
        invited_by_agency_name: invitedByAgencyName,
        status: 'pending',
      });

    setSubmitting(false);

    if (insertError) {
      setError(`Submission failed: ${insertError.message}`);
      return;
    }

    // Fire alert email to Will, Charlie, and Nell — best-effort, non-blocking
    fireAgencyIntakeAlert({
      agency_name: agencyName,
      principal_agent: form.principalAgent.trim(),
      contracting_email: form.contractingEmail.trim(),
      contracting_contact: form.contractingContact.trim() || null,
      agency_npn: form.agencyNpn.trim(),
      city: form.city.trim() || null,
      state: form.state || null,
      submitted_at: new Date().toISOString(),
    });

    setSubmitted(true);
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-12 max-w-2xl w-full text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-navy-600">FYM Financial</h1>
            <p className="text-xs text-gray-600 mt-1">where transparency &amp; opportunity meet</p>
          </div>
          <div className="mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Thank You!</h2>
          <p className="text-lg text-gray-700 mb-4">
            Your agency intake has been submitted. The Contracting team will review it and complete
            setup shortly.
          </p>
          <p className="text-gray-600">
            Questions? Contact{' '}
            <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">
              Contracting@teamfym.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-steel-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy-600">FYM Financial</h1>
          <p className="text-xs text-gray-600 mt-1">where transparency &amp; opportunity meet</p>
        </div>

        {invitedByAgencyName && (
          <div className="mb-5 bg-navy-50 border border-navy-200 rounded-lg px-4 py-3 text-sm text-navy-700">
            Invited by <span className="font-semibold">{invitedByAgencyName}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-navy-600">Agency Intake</h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete this form to submit a new agency for contracting. Fields marked{' '}
              <span className="text-red-500">*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-7">

            {/* ── Agency Name ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.agencyName}
                onChange={setField('agencyName')}
                placeholder="New agency name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                required
              />
            </div>

            {/* ── Address ── */}
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
                Agency Address
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={form.streetAddress}
                    onChange={setField('streetAddress')}
                    placeholder="123 Main St"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={setField('city')}
                      placeholder="City"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={form.state}
                      onChange={setField('state')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Select</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={setField('zip')}
                      placeholder="12345"
                      maxLength={10}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contracting Details ── */}
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
                Contracting Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency NPN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.agencyNpn}
                    onChange={setField('agencyNpn')}
                    placeholder="e.g. 12345678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency EIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.agencyEin}
                    onChange={setField('agencyEin')}
                    placeholder="e.g. 12-3456789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Principal Agent <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.principalAgent}
                    onChange={setField('principalAgent')}
                    placeholder="Full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Principal Agent NPN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.principalAgentNpn}
                    onChange={setField('principalAgentNpn')}
                    placeholder="e.g. 87654321"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contracting Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.contractingEmail}
                    onChange={setField('contractingEmail')}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contracting Contact
                  </label>
                  <input
                    type="text"
                    value={form.contractingContact}
                    onChange={setField('contractingContact')}
                    placeholder="If applicable"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* ── Additional Contacts ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  Additional Contacts
                </p>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>

              {additionalContacts.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  No additional contacts — click Add Contact to include team members.
                </p>
              )}

              {additionalContacts.map((contact, i) => (
                <div
                  key={i}
                  className="relative border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-xs font-semibold text-gray-500 mb-3">Contact {i + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={setContactField(i, 'name')}
                        placeholder="Full name"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={contact.title}
                        onChange={setContactField(i, 'title')}
                        placeholder="e.g. Agency Owner"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                      <input
                        type="text"
                        value={contact.department}
                        onChange={setContactField(i, 'department')}
                        placeholder="e.g. Operations"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={setContactField(i, 'email')}
                        placeholder="email@example.com"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={setContactField(i, 'phone')}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Agency'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
