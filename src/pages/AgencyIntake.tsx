import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';

/**
 * Public, unauthenticated agency intake form.
 *
 * Route: /agency-intake  (no login gate -- handed to the contracting team as a link).
 * Mirrors the "Add New Agency" modal fields. On submit it writes a `pending`
 * row into `agency_intake_submissions` (anon INSERT only, per RLS). It never
 * touches `hierarchy_agencies` -- a CRM admin approves the submission from the
 * Hierarchy tab, which is what creates the real agency record.
 */
export const AgencyIntake: React.FC = () => {
  const navigate = useNavigate();
  const [mainAgencies, setMainAgencies] = useState<CrmAgency[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    agencyName: '',
    parentAgencyId: '',
    agencyNpn: '',
    agencyEin: '',
    principalAgent: '',
    principalAgentNpn: '',
    contractingEmail: '',
    contractingContact: '',
  });

  useEffect(() => {
    const loadMainAgencies = async () => {
      const { data } = await supabase
        .from('hierarchy_agencies')
        .select('id, name')
        .eq('agency_type', 'main')
        .eq('is_active', true)
        .order('name');
      setMainAgencies((data as CrmAgency[]) || []);
    };
    loadMainAgencies();
  }, []);

  const setField = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

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

    const parent = mainAgencies.find((a) => a.id === form.parentAgencyId);

    const { error: insertError } = await supabase
      .from('agency_intake_submissions')
      .insert({
        agency_name: agencyName,
        parent_agency_id: form.parentAgencyId || null,
        parent_agency_name: parent?.name ?? null,
        agency_npn: form.agencyNpn.trim(),
        agency_ein: form.agencyEin.trim(),
        principal_agent: form.principalAgent.trim(),
        principal_agent_npn: form.principalAgentNpn.trim(),
        contracting_email: form.contractingEmail.trim(),
        contracting_contact: form.contractingContact.trim() || null,
        status: 'pending',
      });

    setSubmitting(false);

    if (insertError) {
      setError(`Submission failed: ${insertError.message}`);
      return;
    }

    setSubmitted(true);
  };

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

  return (
    <div className="min-h-screen bg-steel-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy-600">FYM Financial</h1>
          <p className="text-xs text-gray-600 mt-1">where transparency &amp; opportunity meet</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-navy-600">Agency Intake</h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete this form to submit a new agency for contracting. Fields marked{' '}
              <span className="text-red-500">*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Agency</label>
              <select
                value={form.parentAgencyId}
                onChange={setField('parentAgencyId')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">No parent (main agency)</option>
                {mainAgencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
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
