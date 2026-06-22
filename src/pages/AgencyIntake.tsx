import React, { useState, useEffect } from 'react';
import {
  Building2,
  Copy,
  Check,
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase, generateSlug, RESERVED_SLUGS } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';

interface AgencyFormData {
  name: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  agencyType: 'main' | 'sub';
  parentAgencyId: string;
  seatCount: string;
  dateCreated: string;
  existingAgency: boolean;
}

const initialFormData: AgencyFormData = {
  name: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPhone: '',
  agencyType: 'main',
  parentAgencyId: '',
  seatCount: '',
  dateCreated: new Date().toISOString().slice(0, 10),
  existingAgency: false,
};

export const AgencyIntake: React.FC = () => {
  const [formData, setFormData] = useState<AgencyFormData>(initialFormData);
  const [mainAgencies, setMainAgencies] = useState<CrmAgency[]>([]);
  const [recentAgencies, setRecentAgencies] = useState<CrmAgency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const [created, setCreated] = useState<{
    name: string;
    slug: string;
    password: string;
    portalUrl: string;
    agencyType: string;
    parentName: string | null;
  } | null>(null);

  useEffect(() => {
    loadMainAgencies();
    loadRecentAgencies();
  }, []);

  const loadMainAgencies = async () => {
    const { data } = await supabase
      .from('crm_agencies')
      .select('*')
      .eq('agency_type', 'main')
      .eq('is_active', true)
      .order('name');
    setMainAgencies(data || []);
  };

  const loadRecentAgencies = async () => {
    setHistoryLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from('crm_agencies')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentAgencies(data || []);
    setHistoryLoading(false);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Agency name is required.');
      setLoading(false);
      return;
    }

    if (formData.agencyType === 'sub' && !formData.parentAgencyId) {
      setError('Please select a parent agency for sub-agencies.');
      setLoading(false);
      return;
    }

    const slug = generateSlug(trimmedName);
    if (RESERVED_SLUGS.has(slug)) {
      setError(`The name "${trimmedName}" conflicts with a reserved URL path. Please choose a different name.`);
      setLoading(false);
      return;
    }

    const portalPassword = `${trimmedName}CRMPortal!`;
    const configuredUrl = import.meta.env.VITE_APP_URL;
    const baseUrl = configuredUrl || window.location.origin;
    const portalUrl = `${baseUrl}/${slug}`;

    const { data: newAgency, error: insertError } = await supabase
      .from('crm_agencies')
      .insert({
        name: trimmedName,
        onboarding_status: formData.existingAgency ? 'onboarding_complete' : 'pending_csr_assignment',
        is_active: true,
        agency_type: formData.agencyType,
        parent_agency_id: formData.agencyType === 'sub' ? formData.parentAgencyId : null,
        slug,
        portal_password: portalPassword,
        date_created: formData.dateCreated || null,
        seat_count: formData.seatCount ? parseInt(formData.seatCount, 10) : 0,
        zaps_paused: formData.existingAgency,
        agency_phone: formData.ownerPhone.replace(/\D/g, '') || null,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505') {
        setError('An agency with this name already exists.');
      } else {
        setError('Failed to create agency. Please try again.');
      }
      setLoading(false);
      return;
    }

    if (newAgency) {
      const parentName = formData.agencyType === 'sub'
        ? mainAgencies.find((a) => a.id === formData.parentAgencyId)?.name || null
        : null;

      const message = formData.existingAgency
        ? `Existing agency "${trimmedName}" added via contracting intake -- zaps paused for backfill`
        : formData.agencyType === 'sub'
          ? `New sub-agency "${trimmedName}" added under ${parentName} via contracting intake`
          : `New agency "${trimmedName}" added via contracting intake -- begin onboarding`;

      await supabase.from('crm_notifications').insert({
        agency_id: newAgency.id,
        type: 'agency_added',
        message,
      });

      setCreated({
        name: trimmedName,
        slug,
        password: portalPassword,
        portalUrl,
        agencyType: formData.agencyType,
        parentName,
      });

      setFormData(initialFormData);
      loadRecentAgencies();
      loadMainAgencies();
    }

    setLoading(false);
  };

  const getStatusBadge = (agency: CrmAgency) => {
    if (agency.onboarding_status === 'onboarding_complete') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> Complete
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> Onboarding
      </span>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-700">Agency Intake</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new agency and generate their portal credentials.
        </p>
      </div>

      {created && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-800 text-lg">
                Agency Created Successfully
              </h3>
              <p className="text-sm text-emerald-700 mt-1">
                <span className="font-medium">{created.name}</span>
                {created.agencyType === 'sub' && created.parentName && (
                  <span className="text-emerald-600"> (sub-agency of {created.parentName})</span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Portal URL:</span>
                <span className="font-mono font-medium text-navy-600">{created.portalUrl}</span>
              </div>
              <button
                onClick={() => handleCopy(created.portalUrl, 'url')}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy URL"
              >
                {copied === 'url' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Password:</span>
                <span className="font-mono font-medium text-gray-700">{created.password}</span>
              </div>
              <button
                onClick={() => handleCopy(created.password, 'password')}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy Password"
              >
                {copied === 'password' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setCreated(null)}
            className="text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
          >
            Create Another Agency
          </button>
        </div>
      )}

      {!created && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-navy-700 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              New Agency Details
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="Enter agency name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner First Name</label>
                <input
                  type="text"
                  value={formData.ownerFirstName}
                  onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Last Name</label>
                <input
                  type="text"
                  value={formData.ownerLastName}
                  onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="owner@agency.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                <input
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: formatPhone(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seat Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.seatCount}
                  onChange={(e) => setFormData({ ...formData, seatCount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="Number of agent seats"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                <input
                  type="date"
                  value={formData.dateCreated}
                  onChange={(e) => setFormData({ ...formData, dateCreated: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Backdate if the account existed before today.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agency Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, agencyType: 'main', parentAgencyId: '' })}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    formData.agencyType === 'main'
                      ? 'bg-navy-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Main Agency
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, agencyType: 'sub' })}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                    formData.agencyType === 'sub'
                      ? 'bg-navy-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sub Agency
                </button>
              </div>
            </div>

            {formData.agencyType === 'sub' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Agency</label>
                <select
                  value={formData.parentAgencyId}
                  onChange={(e) => setFormData({ ...formData, parentAgencyId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Select a parent agency...</option>
                  {mainAgencies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {mainAgencies.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No active main agencies found.</p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.existingAgency}
                onChange={(e) => setFormData({ ...formData, existingAgency: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Existing agency (skip onboarding, pause zaps for backfill)
              </span>
            </label>

            {formData.name.trim() && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500">Portal slug:</span>
                  <span className="font-mono font-medium text-navy-600">/{generateSlug(formData.name.trim())}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500">Password:</span>
                  <span className="font-mono font-medium text-gray-700">{formData.name.trim()}CRMPortal!</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Agency...' : 'Create Agency'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        >
          <h2 className="font-semibold text-navy-700 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recently Created Agencies
            <span className="text-xs text-gray-400 font-normal">(last 30 days)</span>
          </h2>
          {historyOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {historyOpen && (
          <div className="px-6 pb-5 border-t border-gray-100">
            {historyLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-600 mx-auto" />
              </div>
            ) : recentAgencies.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No agencies created in the last 30 days.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {recentAgencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-navy-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{agency.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{new Date(agency.created_at).toLocaleDateString()}</span>
                          {agency.agency_type === 'sub' && (
                            <span className="text-navy-500">Sub-agency</span>
                          )}
                          {agency.slug && (
                            <span className="font-mono">/{agency.slug}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(agency)}
                      {agency.slug && (
                        <button
                          onClick={() => handleCopy(`${window.location.origin}/${agency.slug}`, `hist-${agency.id}`)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Copy portal URL"
                        >
                          {copied === `hist-${agency.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
