import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Building2, Phone, Mail, Calendar, Globe, Save, Hash, User, AlertCircle, MapPin, Users, StickyNote, Plus, Trash2, Eye, EyeOff, Copy, Check as CheckIcon, ExternalLink, Link2, Send } from 'lucide-react';
import { supabase, US_STATES } from '../../lib/supabase';
import type { CrmAgency, AgencyContact, AgencyNote } from '../../lib/supabase';

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
  const [noteInput, setNoteInput] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notes, setNotes] = useState<AgencyNote[]>(
    Array.isArray(agency.internal_notes) ? agency.internal_notes : []
  );
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const handleCopyPassword = () => {
    if (!agency.portal_password) return;
    navigator.clipboard.writeText(agency.portal_password).then(() => {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    });
  };
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
    street_address: agency.street_address || '',
    city: agency.city || '',
    agency_state: agency.agency_state || '',
    zip: agency.zip || '',
  });
  const [additionalContacts, setAdditionalContacts] = useState<AgencyContact[]>(
    agency.additional_contacts ?? []
  );

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
    const cleanedContacts = additionalContacts.filter(c => c.name.trim());
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
        street_address: form.street_address.trim() || null,
        city: form.city.trim() || null,
        agency_state: form.agency_state.trim() || null,
        zip: form.zip.trim() || null,
        additional_contacts: cleanedContacts,
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
        street_address: form.street_address.trim() || null,
        city: form.city.trim() || null,
        agency_state: form.agency_state.trim() || null,
        zip: form.zip.trim() || null,
        additional_contacts: cleanedContacts,
      });
      setAdditionalContacts(cleanedContacts);
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
        </div>
      </div>

      {/* Contracting Portal Access */}
      <div className="border-t border-steel-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-steel-400" />
          <h4 className="font-semibold text-steel-900 text-sm">Contracting Portal Access</h4>
        </div>
        <div className="space-y-3">

          {/* Portal URL */}
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Portal URL</label>
            {agency.slug ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-steel-900 font-mono">
                  contracting.teamfym.com/agency/<span className="text-navy-700">{agency.slug}</span>
                </p>
                <a
                  href={`${import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || 'https://contracting.teamfym.com'}/agency/${agency.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-steel-400 hover:text-navy-600 transition-colors"
                  title="Open contracting portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-steel-400 italic">Not assigned</p>
            )}
          </div>

          {/* Portal Password */}
          <div className="space-y-1">
            <label className="text-xs text-steel-500">Portal Password</label>
            {agency.portal_password ? (
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-steel-900 font-mono tracking-wide select-all">
                  {showPassword ? agency.portal_password : '••••••••••••'}
                </p>
                <button
                  onClick={() => setShowPassword(v => !v)}
                  className="p-1 text-steel-400 hover:text-steel-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Reveal password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCopyPassword}
                  className="p-1 text-steel-400 hover:text-navy-600 transition-colors"
                  title="Copy password"
                >
                  {passwordCopied
                    ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-steel-400 italic">Not set</p>
            )}
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

      {/* Address Section */}
      <div className="border-t border-steel-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-steel-400" />
          <h4 className="font-semibold text-steel-900 text-sm">Agency Address</h4>
        </div>
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={form.street_address}
              onChange={(e) => setForm(f => ({ ...f, street_address: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="Street Address"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                className="col-span-1 px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="City"
              />
              <select
                value={form.agency_state}
                onChange={(e) => setForm(f => ({ ...f, agency_state: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent bg-white"
              >
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm(f => ({ ...f, zip: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-steel-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                placeholder="ZIP"
                maxLength={10}
              />
            </div>
          </div>
        ) : (
          <p className={`text-sm ${(agency.street_address || agency.city) ? 'text-steel-900' : 'text-steel-400 italic'}`}>
            {[agency.street_address, agency.city, agency.agency_state, agency.zip].filter(Boolean).join(', ') || 'Not provided'}
          </p>
        )}
      </div>

      {/* Additional Contacts Section */}
      <div className="border-t border-steel-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-steel-400" />
            <h4 className="font-semibold text-steel-900 text-sm">Additional Contacts</h4>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setAdditionalContacts(prev => [...prev, { name: '', title: '', department: '', email: '', phone: '' }])}
              className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {!editing && (additionalContacts.length === 0) && (
          <p className="text-sm text-steel-400 italic">No additional contacts on file.</p>
        )}

        {editing ? (
          <div className="space-y-3">
            {additionalContacts.length === 0 && (
              <p className="text-xs text-steel-400 italic">No contacts — click Add above.</p>
            )}
            {additionalContacts.map((c, i) => (
              <div key={i} className="relative border border-steel-200 rounded-lg p-3 bg-steel-50/50">
                <button
                  type="button"
                  onClick={() => setAdditionalContacts(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2.5 right-2.5 text-steel-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-[10px] font-semibold text-steel-400 uppercase mb-2">Contact {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['name', 'title', 'department', 'email', 'phone'] as (keyof AgencyContact)[]).map(field => (
                    <input
                      key={field}
                      type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                      value={c[field]}
                      onChange={(e) => setAdditionalContacts(prev =>
                        prev.map((ct, idx) => idx === i ? { ...ct, [field]: e.target.value } : ct)
                      )}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="px-2.5 py-1.5 text-xs border border-steel-300 rounded-md focus:ring-1 focus:ring-navy-500 focus:border-transparent"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {additionalContacts.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-steel-900">{c.name}</span>
                {c.title && <span className="text-steel-500"> · {c.title}</span>}
                {c.department && <span className="text-steel-400"> ({c.department})</span>}
                {c.email && <span className="text-steel-500"> · {c.email}</span>}
                {c.phone && <span className="text-steel-500"> · {c.phone}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal Notes Section */}
      <InternalNotesSection
        agencyId={agency.id}
        notes={notes}
        onNotesChange={(updated) => {
          setNotes(updated);
          onAgencyUpdated({ ...agency, internal_notes: updated });
        }}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        notesSaving={notesSaving}
        setNotesSaving={setNotesSaving}
        noteInputRef={noteInputRef}
      />
    </div>
  );
};

// ─── Internal Notes sub-component ──────────────────────────────────────────

function formatNoteTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso)) + ' CT';
  } catch {
    return iso;
  }
}

interface InternalNotesSectionProps {
  agencyId: string;
  notes: AgencyNote[];
  onNotesChange: (updated: AgencyNote[]) => void;
  noteInput: string;
  setNoteInput: (v: string) => void;
  notesSaving: boolean;
  setNotesSaving: (v: boolean) => void;
  noteInputRef: React.RefObject<HTMLTextAreaElement>;
}

const InternalNotesSection: React.FC<InternalNotesSectionProps> = ({
  agencyId,
  notes,
  onNotesChange,
  noteInput,
  setNoteInput,
  notesSaving,
  setNotesSaving,
  noteInputRef,
}) => {
  const [focused, setFocused] = useState(false);

  const handleAddNote = async () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotesSaving(true);
    const newNote: AgencyNote = {
      text,
      created_at: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    const { error } = await supabase
      .from('hierarchy_agencies')
      .update({ internal_notes: updated, updated_at: new Date().toISOString() })
      .eq('id', agencyId);
    if (!error) {
      onNotesChange(updated);
      setNoteInput('');
      setFocused(false);
    }
    setNotesSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddNote();
    }
    if (e.key === 'Escape') {
      setNoteInput('');
      setFocused(false);
      noteInputRef.current?.blur();
    }
  };

  return (
    <div className="border-t border-steel-200 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="w-4 h-4 text-steel-400" />
        <h4 className="font-semibold text-steel-900 text-sm">Internal Notes</h4>
        <span className="text-xs text-steel-400 ml-auto">
          {notes.length > 0 ? `${notes.length} entr${notes.length === 1 ? 'y' : 'ies'}` : ''}
        </span>
      </div>

      {/* Compose area */}
      <div className={`mb-4 rounded-lg border transition-all ${
        focused
          ? 'border-navy-400 ring-2 ring-navy-100 bg-white'
          : 'border-steel-200 bg-steel-50 hover:border-steel-300'
      }`}>
        <textarea
          ref={noteInputRef}
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!noteInput.trim()) setFocused(false); }}
          onKeyDown={handleKeyDown}
          rows={focused ? 3 : 1}
          placeholder="Add a note… (Cmd+Enter to save)"
          className="w-full px-3 py-2 text-sm bg-transparent border-none outline-none resize-none placeholder:text-steel-400"
        />
        {focused && (
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[10px] text-steel-400">Cmd+Enter to save · Esc to cancel</span>
            <button
              onClick={handleAddNote}
              disabled={notesSaving || !noteInput.trim()}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3 h-3" />
              {notesSaving ? 'Saving…' : 'Add Note'}
            </button>
          </div>
        )}
      </div>

      {/* Notes feed — newest first */}
      {notes.length === 0 ? (
        <p className="text-sm text-steel-400 italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div
              key={i}
              className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3"
            >
              <p className="text-xs text-amber-700 font-medium mb-1">
                {formatNoteTimestamp(note.created_at)}
              </p>
              <p className="text-sm text-steel-900 whitespace-pre-wrap">{note.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
