import React, { useState, useEffect } from 'react';
import { X, Link2 } from 'lucide-react';
import { supabase, generateSlug, RESERVED_SLUGS } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';

interface AddAgencyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAgencyModal: React.FC<AddAgencyModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [dateCreated, setDateCreated] = useState(new Date().toISOString().slice(0, 10));
  const [agencyType, setAgencyType] = useState<'main' | 'sub'>('main');
  const [parentAgencyId, setParentAgencyId] = useState('');
  const [existingAgency, setExistingAgency] = useState(false);
  const [mainAgencies, setMainAgencies] = useState<CrmAgency[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMainAgencies = async () => {
      const { data } = await supabase
        .from('crm_agencies')
        .select('*')
        .eq('agency_type', 'main')
        .eq('is_active', true)
        .order('name');
      setMainAgencies(data || []);
    };
    loadMainAgencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Agency name is required.');
      setSubmitting(false);
      return;
    }

    if (agencyType === 'sub' && !parentAgencyId) {
      setError('Please select a parent agency for sub-agencies.');
      setSubmitting(false);
      return;
    }

    const slug = generateSlug(trimmedName);
    if (RESERVED_SLUGS.has(slug)) {
      setError(`The name "${trimmedName}" conflicts with a reserved URL path. Please choose a different name.`);
      setSubmitting(false);
      return;
    }

    // Ensure auth session is active before writing
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const serviceEmail = import.meta.env.VITE_SERVICE_EMAIL;
      const servicePassword = import.meta.env.VITE_SERVICE_PASSWORD;
      if (serviceEmail && servicePassword) {
        await supabase.auth.signInWithPassword({ email: serviceEmail, password: servicePassword });
      }
    }

    const portalPassword = `${trimmedName}CRMPortal!`;

    const { data: newAgency, error: insertError } = await supabase
      .from('crm_agencies')
      .insert({
        name: trimmedName,
        onboarding_status: existingAgency ? 'onboarding_complete' : 'pending_csr_assignment',
        is_active: true,
        agency_type: agencyType,
        parent_agency_id: agencyType === 'sub' ? parentAgencyId : null,
        slug,
        portal_password: portalPassword,
        date_created: dateCreated || null,
        zaps_paused: existingAgency,
        crm_enabled: true,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505') {
        setError('An agency with this name already exists.');
      } else {
        setError(`Failed to create agency: ${insertError.message}`);
      }
      setSubmitting(false);
      return;
    }

    if (!newAgency) {
      setError('Agency creation failed. Please log out and log back in, then try again.');
      setSubmitting(false);
      return;
    }

    const parentName = agencyType === 'sub'
      ? mainAgencies.find((a) => a.id === parentAgencyId)?.name
      : null;
    const message = existingAgency
      ? `Existing agency "${trimmedName}" added -- zaps paused for backfill`
      : agencyType === 'sub'
        ? `New sub-agency "${trimmedName}" added under ${parentName} -- begin onboarding`
        : `New agency "${trimmedName}" added -- begin onboarding`;

    await supabase.from('crm_notifications').insert({
      agency_id: newAgency.id,
      type: 'agency_added',
      message,
    });

    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-navy-600">Add New Agency</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
              placeholder="Enter agency name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
            <input
              type="date"
              value={dateCreated}
              onChange={(e) => setDateCreated(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Backdate if the account was created before today.</p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={existingAgency}
              onChange={(e) => setExistingAgency(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Existing agency (pause zaps during backfill)
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agency Type</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => { setAgencyType('main'); setParentAgencyId(''); }}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  agencyType === 'main'
                    ? 'bg-navy-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Main Agency
              </button>
              <button
                type="button"
                onClick={() => setAgencyType('sub')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                  agencyType === 'sub'
                    ? 'bg-navy-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Sub Agency
              </button>
            </div>
          </div>

          {agencyType === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Agency</label>
              <select
                value={parentAgencyId}
                onChange={(e) => setParentAgencyId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">Select a parent agency...</option>
                {mainAgencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {mainAgencies.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No active main agencies found. Create a main agency first.</p>
              )}
            </div>
          )}

          {name.trim() && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Portal URL:</span>
                <span className="font-mono font-medium text-navy-600">/{generateSlug(name.trim())}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 ml-5.5">Password:</span>
                <span className="font-mono font-medium text-gray-700">{name.trim()}CRMPortal!</span>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            {existingAgency
              ? 'The agency will skip onboarding and zaps will be paused until you manually enable them after backfilling data.'
              : agencyType === 'sub'
                ? 'The sub-agency will have its own independent CSR assignment and onboarding workflow.'
                : 'The agency will start in the onboarding workflow where you can assign a CSR, upload rosters, and complete setup.'}
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
