import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Building2, Phone, Mail, Calendar, Globe, Save, Hash, User, AlertCircle } from 'lucide-react';
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
  const [emailError, setEmailError] = useState('');
  const [hasRoster, setHasRoster] = useState(false);
  const [form, setForm] = useState({
    agency_phone: agency.agency_phone || '',
    business_name: agency.business_name || '',
    agency_npn: agency.agency_npn || '',
    agency_ein: agency.agency_ein || '',
    principal_agent: agency.principal_agent || '',
    principal_agent_npn: agency.principal_agent_npn || '',
    contracting_email: agency.contracting_email || '',
    contracting_contact: agency.contracting_contact || '',
  });

  const isFym = agency.name.toLowerCase() === 'fym';
  const isRoot = agency.agency_type === 'main';
  const showContractingRequired = !isFym && !isRoot;

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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSave = async () => {
    if (form.contracting_email.trim() && !emailRegex.test(form.contracting_email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setSaving(true);
    const { error } = await supabase
      .from('hierarchy_agencies')
      .update({
        agency_phone: form.agency_phone.trim() || null,
        business_name: form.business_name.trim() || null,
        agency_npn: form.agency_npn.trim() || null,
        agency_ein: form.agency_ein.trim() || null,
        principal_agent: form.principal_agent.trim() || null,
        principal_agent_npn: form.principal_agent_npn.trim() || null,
        contracting_email: form.contracting_email.trim() || null,
        contracting_contact: form.contracting_contact.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({
        ...agency,
        agency_phone: form.agency_phone.trim() || null,
        business_name: form.business_name.trim() || null,
        agency_npn: form.agency_npn.trim() || null,
        agency_ein: form.agency_ein.trim() || null,
        principal_agent: form.principal_agent.trim() || null,
        principal_agent_npn: form.principal_agent_npn.trim() || null,
        contracting_email: form.contracting_email.trim() || null,
        contracting_contact: form.contracting_contact.trim() || null,
      });
      setEditing(false);
    }
    setSaving(false);
  };

  const contractingDetailsFilled = !!(
    agency.agency_npn?.trim() &&
    agency.agency_ein?.trim() &&
    agency.principal_agent?.trim() &&
    agency.principal_agent_npn?.trim() &&
    agency.contracting_email?.trim()
  );

  const steps = [
    {
      label: 'Agency Information Collected',
      done: true,
      detail: `Created on ${agency.date_created || agency.created_at?.slice(0, 10) || 'Unknown'}`,
    },
    ...(showContractingRequired ? [{
      label: 'Contracting Details Provided',
      done: contractingDetailsFilled,
      detail: contractingDetailsFilled
        ? `NPN: ${agency.agency_npn} | Principal: ${agency.principal_agent}`
        : 'Missing required contracting fields -- click Edit below to complete',
    }] : []),
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
      done: hasRoster && !!(agency.agency_phone?.trim()) && (contractingDetailsFilled || !showContractingRequired),
      detail: hasRoster && agency.agency_phone?.trim() && (contractingDetailsFilled || !showContractingRequired)
        ? 'All prerequisites met' : 'Complete above steps first',
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
              <button onClick={() => { setEditing(false); setEmailError(''); }} className="text-xs text-steel-500 hover:text-steel-700">
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

        {emailError && (
          <div className="mb-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {emailError}
          </div>
        )}

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

      {/* UNL / Rolodex Reference Fields */}
      {(agency.agency_state || agency.unl_writing_number || agency.unl_status) && (
        <div className="border-t border-steel-200 pt-6">
          <h4 className="font-semibold text-steel-900 text-sm mb-4">UNL Reference Data</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-steel-500">State</label>
              <p className="text-sm font-medium text-steel-900">{agency.agency_state || '--'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-steel-500">UNL Writing Number</label>
              <p className="text-sm font-medium text-steel-900 font-mono">{agency.unl_writing_number || '--'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-steel-500">UNL Status</label>
              <p className={`text-sm font-medium ${
                agency.unl_status === 'Active' ? 'text-emerald-700' :
                agency.unl_status === 'Terminated' ? 'text-red-600' :
                'text-amber-700'
              }`}>{agency.unl_status || '--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contracting Details Section */}
      <div className="border-t border-steel-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="font-semibold text-steel-900 text-sm">Contracting Details</h4>
          {showContractingRequired && !contractingDetailsFilled && (
            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase">
              Incomplete
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Agency NPN {showContractingRequired && <span className="text-red-500">*</span>}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.agency_npn}
                onChange={(e) => setForm(f => ({ ...f, agency_npn: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="e.g. 12345678"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.agency_npn ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.agency_npn || 'Not provided'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Agency EIN {showContractingRequired && <span className="text-red-500">*</span>}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.agency_ein}
                onChange={(e) => setForm(f => ({ ...f, agency_ein: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="e.g. 12-3456789"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.agency_ein ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.agency_ein || 'Not provided'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              Principal Agent {showContractingRequired && <span className="text-red-500">*</span>}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.principal_agent}
                onChange={(e) => setForm(f => ({ ...f, principal_agent: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="Full name"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.principal_agent ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.principal_agent || 'Not provided'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Principal Agent NPN {showContractingRequired && <span className="text-red-500">*</span>}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.principal_agent_npn}
                onChange={(e) => setForm(f => ({ ...f, principal_agent_npn: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="e.g. 87654321"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.principal_agent_npn ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.principal_agent_npn || 'Not provided'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Contracting Email {showContractingRequired && <span className="text-red-500">*</span>}
            </label>
            {editing ? (
              <input
                type="email"
                value={form.contracting_email}
                onChange={(e) => { setForm(f => ({ ...f, contracting_email: e.target.value })); setEmailError(''); }}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.contracting_email ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.contracting_email || 'Not provided'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-steel-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              Contracting Contact
            </label>
            {editing ? (
              <input
                type="text"
                value={form.contracting_contact}
                onChange={(e) => setForm(f => ({ ...f, contracting_contact: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="If applicable"
              />
            ) : (
              <p className={`text-sm font-medium ${agency.contracting_contact ? 'text-steel-900' : 'text-steel-400 italic'}`}>
                {agency.contracting_contact || 'Not provided'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
