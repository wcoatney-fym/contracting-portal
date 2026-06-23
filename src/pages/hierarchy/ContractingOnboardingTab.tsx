import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Building2, Phone, Mail, Calendar, Globe, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';

interface ContractingOnboardingTabProps {
  agency: CrmAgency;
  onAgencyUpdated: (updated: CrmAgency) => void;
}

export const ContractingOnboardingTab: React.FC<ContractingOnboardingTabProps> = ({
  agency,
  onAgencyUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasRoster, setHasRoster] = useState(false);
  const [form, setForm] = useState({
    agency_phone: agency.agency_phone || '',
    business_name: agency.business_name || '',
  });

  useEffect(() => {
    checkRoster();
  }, [agency.name]);

  const checkRoster = async () => {
    const { data } = await supabase
      .from('crm_roster_uploads')
      .select('id')
      .eq('agency', agency.name)
      .limit(1);
    setHasRoster((data || []).length > 0);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('crm_agencies')
      .update({
        agency_phone: form.agency_phone.trim() || null,
        business_name: form.business_name.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({
        ...agency,
        agency_phone: form.agency_phone.trim() || null,
        business_name: form.business_name.trim() || null,
      });
      setEditing(false);
    }
    setSaving(false);
  };

  const steps = [
    {
      label: 'Agency Information Collected',
      done: true,
      detail: `Created on ${agency.date_created || agency.created_at?.slice(0, 10) || 'Unknown'}`,
    },
    {
      label: 'Contact Details Provided',
      done: !!(agency.agency_phone?.trim()),
      detail: agency.agency_phone ? `Phone: ${agency.agency_phone}` : 'Phone number not yet provided',
    },
    {
      label: 'Agent Roster Uploaded',
      done: hasRoster,
      detail: hasRoster ? 'Roster file uploaded' : 'No roster uploaded yet',
    },
    {
      label: 'Ready for Production',
      done: hasRoster && !!(agency.agency_phone?.trim()),
      detail: hasRoster && agency.agency_phone?.trim() ? 'All prerequisites met' : 'Complete above steps first',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-steel-900">Contracting Onboarding</h3>
          <p className="text-sm text-steel-500 mt-0.5">
            {completedCount}/{steps.length} steps completed
          </p>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-steel-100 flex items-center justify-center relative">
          <svg className="absolute inset-0 w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="18" fill="none" stroke="#1e3a5f" strokeWidth="4"
              strokeDasharray={`${(completedCount / steps.length) * 113} 113`}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-xs font-bold text-navy-700">{Math.round((completedCount / steps.length) * 100)}%</span>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
            step.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-steel-200'
          }`}>
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-steel-300 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${step.done ? 'text-emerald-800' : 'text-steel-700'}`}>
                {step.label}
              </p>
              <p className="text-xs text-steel-500 mt-0.5">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-steel-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-steel-900 text-sm">Agency Details</h4>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy-600 hover:text-navy-700 font-medium"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-steel-500 hover:text-steel-700">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-700 font-medium disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Agency Name
            </label>
            <p className="text-sm font-medium text-steel-900">{agency.name}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date Created
            </label>
            <p className="text-sm font-medium text-steel-900">
              {agency.date_created || agency.created_at?.slice(0, 10) || '--'}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Agency Phone
            </label>
            {editing ? (
              <input
                type="tel"
                value={form.agency_phone}
                onChange={(e) => setForm(f => ({ ...f, agency_phone: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            ) : (
              <p className="text-sm font-medium text-steel-900">{agency.agency_phone || '--'}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Business Name (DBA)
            </label>
            {editing ? (
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="Business name"
              />
            ) : (
              <p className="text-sm font-medium text-steel-900">{agency.business_name || '--'}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Portal Slug
            </label>
            <p className="text-sm font-medium text-steel-900">{agency.slug || '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
