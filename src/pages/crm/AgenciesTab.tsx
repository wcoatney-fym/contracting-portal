import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, ChevronRight, FlaskConical, GitBranch, X, UserCheck, Phone, ExternalLink } from 'lucide-react';
import { supabase, formatPhoneDisplay } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';
import { AddAgencyModal } from '../../components/AddAgencyModal';
import { AgencyProfileView } from './AgencyProfileView';

const STATUS_LABELS: Record<string, string> = {
  pending_csr_assignment: 'Pending CSR Assignment',
  awaiting_agency_phone: 'Awaiting Phone & Setup',
  awaiting_roster_upload: 'Awaiting Roster Upload',
  awaiting_dba_upload: 'Awaiting DBA Upload',
  onboarding_complete: 'Onboarding Complete',
};

const STATUS_COLORS: Record<string, string> = {
  pending_csr_assignment: 'bg-amber-100 text-amber-800',
  awaiting_agency_phone: 'bg-sky-100 text-sky-800',
  awaiting_roster_upload: 'bg-blue-100 text-blue-800',
  awaiting_dba_upload: 'bg-teal-100 text-teal-800',
  onboarding_complete: 'bg-emerald-100 text-emerald-800',
};

export const AgenciesTab: React.FC = () => {
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [filledSeats, setFilledSeats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [csrPanelAgency, setCsrPanelAgency] = useState<CrmAgency | null>(null);
  const [csrForm, setCsrForm] = useState({ firstName: '', lastName: '', phone: '', email: '', npn: '' });
  const [csrSaving, setCsrSaving] = useState(false);
  const [crmPanelAgency, setCrmPanelAgency] = useState<CrmAgency | null>(null);
  const [crmNumberValue, setCrmNumberValue] = useState('');
  const [crmSaving, setCrmSaving] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<CrmAgency | null>(null);

  const getParentName = (agency: CrmAgency): string | null => {
    if (agency.agency_type !== 'sub' || !agency.parent_agency_id) return null;
    return agencies.find((a) => a.id === agency.parent_agency_id)?.name || null;
  };

  const loadAgencies = async () => {
    setLoading(true);
    // Ensure auth session is active for authenticated-role reads
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const serviceEmail = import.meta.env.VITE_SERVICE_EMAIL;
      const servicePassword = import.meta.env.VITE_SERVICE_PASSWORD;
      if (serviceEmail && servicePassword) {
        await supabase.auth.signInWithPassword({ email: serviceEmail, password: servicePassword });
      }
    }

    const [agencyRes, uploadsRes] = await Promise.all([
      supabase.from('crm_agencies').select('*').eq('crm_enabled', true).order('name'),
      supabase.from('crm_roster_uploads').select('id, agency').order('uploaded_at', { ascending: false }),
    ]);

    setAgencies(agencyRes.data || []);

    const latestUploadByAgency: Record<string, string> = {};
    for (const upload of (uploadsRes.data || [])) {
      if (upload.agency && !latestUploadByAgency[upload.agency]) {
        latestUploadByAgency[upload.agency] = upload.id;
      }
    }

    const counts: Record<string, number> = {};
    const uploadIds = Object.values(latestUploadByAgency);
    if (uploadIds.length > 0) {
      const { data: rows } = await supabase
        .from('crm_roster')
        .select('upload_id, row_data')
        .in('upload_id', uploadIds);

      const uploadToAgency: Record<string, string> = {};
      for (const [agency, uid] of Object.entries(latestUploadByAgency)) {
        uploadToAgency[uid] = agency;
      }

      for (const row of (rows || [])) {
        const agency = uploadToAgency[row.upload_id];
        if (agency && row.row_data['First Name']?.trim()) {
          counts[agency] = (counts[agency] || 0) + 1;
        }
      }
    }

    setFilledSeats(counts);
    setLoading(false);
  };

  useEffect(() => { loadAgencies(); }, []);

  const toggleActive = async (agency: CrmAgency, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('crm_agencies')
      .update({ is_active: !agency.is_active, updated_at: new Date().toISOString() })
      .eq('id', agency.id);

    if (!error) {
      setAgencies((prev) =>
        prev.map((a) => a.id === agency.id ? { ...a, is_active: !a.is_active } : a)
      );
    }
  };

  const openCsrPanel = (agency: CrmAgency, e: React.MouseEvent) => {
    e.stopPropagation();
    setCsrPanelAgency(agency);
    setCsrForm({
      firstName: agency.csr_first_name || '',
      lastName: agency.csr_last_name || '',
      phone: agency.csr_phone || '',
      email: agency.csr_email || '',
      npn: agency.csr_npn || '',
    });
  };

  const saveCsrDetails = async () => {
    if (!csrPanelAgency) return;
    const fullName = `${csrForm.firstName.trim()} ${csrForm.lastName.trim()}`.trim();
    setCsrSaving(true);
    const { error } = await supabase
      .from('crm_agencies')
      .update({
        assigned_csr: fullName || null,
        csr_first_name: csrForm.firstName.trim() || null,
        csr_last_name: csrForm.lastName.trim() || null,
        csr_phone: csrForm.phone.trim() || null,
        csr_email: csrForm.email.trim() || null,
        csr_npn: csrForm.npn.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', csrPanelAgency.id);

    if (!error) {
      setAgencies((prev) =>
        prev.map((a) => a.id === csrPanelAgency.id ? {
          ...a,
          assigned_csr: fullName || null,
          csr_first_name: csrForm.firstName.trim() || null,
          csr_last_name: csrForm.lastName.trim() || null,
          csr_phone: csrForm.phone.trim() || null,
          csr_email: csrForm.email.trim() || null,
          csr_npn: csrForm.npn.trim() || null,
        } : a)
      );
    }
    setCsrSaving(false);
    setCsrPanelAgency(null);
  };

  const openCrmPanel = (agency: CrmAgency, e: React.MouseEvent) => {
    e.stopPropagation();
    setCrmPanelAgency(agency);
    setCrmNumberValue(agency.crm_number || '');
  };

  const saveCrmNumber = async () => {
    if (!crmPanelAgency) return;
    const num = crmNumberValue.trim();
    if (!num) return;
    setCrmSaving(true);

    const { error } = await supabase
      .from('crm_agencies')
      .update({ crm_number: num, updated_at: new Date().toISOString() })
      .eq('id', crmPanelAgency.id);

    if (!error) {
      const { data: uploads } = await supabase
        .from('crm_roster_uploads')
        .select('id')
        .eq('agency', crmPanelAgency.name)
        .order('uploaded_at', { ascending: false })
        .limit(1);

      if (uploads && uploads.length > 0) {
        const { data: rows } = await supabase
          .from('crm_roster')
          .select('id, row_data')
          .eq('upload_id', uploads[0].id);

        if (rows) {
          const batchSize = 50;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            await Promise.all(
              batch.map((row) =>
                supabase
                  .from('crm_roster')
                  .update({
                    row_data: { ...row.row_data, 'All Templates | Agent CRM #': num },
                  })
                  .eq('id', row.id)
              )
            );
          }
        }
      }

      setAgencies((prev) =>
        prev.map((a) => a.id === crmPanelAgency.id ? { ...a, crm_number: num } : a)
      );
    }
    setCrmSaving(false);
    setCrmPanelAgency(null);
  };

  const handleAgencyUpdated = (updated: CrmAgency) => {
    setAgencies((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setSelectedAgency(updated);
  };

  const filtered = search
    ? agencies.filter((a) => {
        const q = search.toLowerCase();
        const parentName = getParentName(a)?.toLowerCase() || '';
        return a.name.toLowerCase().includes(q) || parentName.includes(q);
      })
    : agencies;

  if (selectedAgency) {
    return (
      <AgencyProfileView
        agency={selectedAgency}
        allAgencies={agencies}
        onBack={() => { setSelectedAgency(null); loadAgencies(); }}
        onAgencyUpdated={handleAgencyUpdated}
        onNavigateToAgency={(a) => setSelectedAgency(a)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-white rounded-xl border border-steel-200 animate-pulse" />
          <div className="h-10 w-36 bg-navy-100 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-steel-200 overflow-hidden">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 border-b border-steel-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            placeholder="Search agencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-steel-200 rounded-xl focus:ring-2 focus:ring-navy-200 focus:border-navy-400 text-sm shadow-sm"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-navy-600 rounded-xl hover:bg-navy-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add New Agency
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-steel-200 p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-steel-300 mx-auto mb-3" />
          <p className="text-steel-500">{search ? 'No agencies match your search' : 'No agencies added yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-steel-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-steel-50/50 border-b border-steel-200">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Agency Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Agency</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Quick Link</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Assigned CSR</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">CRM #</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Onboarding Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Date Added</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Seats</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-steel-500 uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {filtered.map((agency) => {
                  const parentName = getParentName(agency);
                  return (
                    <tr
                      key={agency.id}
                      onClick={() => setSelectedAgency(agency)}
                      className="hover:bg-navy-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-semibold text-gray-900">{agency.name}</span>
                            {parentName && (
                              <p className="text-xs text-gray-400 mt-0.5">under {parentName}</p>
                            )}
                          </div>
                          {agency.is_test && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded border border-amber-200">
                              <FlaskConical className="w-2.5 h-2.5" />
                              Test
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-mono text-gray-700">
                          {agency.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {agency.slug ? (
                          <a
                            href={`${import.meta.env.VITE_APP_URL || window.location.origin}/${agency.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-sm text-navy-600 hover:underline"
                          >
                            {agency.slug}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {agency.agency_type === 'main' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-navy-600/10 text-navy-600">
                            Main
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            <GitBranch className="w-3 h-3" />
                            Sub
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={(e) => openCsrPanel(agency, e)}
                          className="text-sm text-gray-600 hover:text-navy-600 hover:underline transition-colors"
                        >
                          {agency.assigned_csr || <span className="text-gray-400 italic">Unassigned</span>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {agency.crm_number ? (
                          <span className="text-sm font-medium text-gray-900">{formatPhoneDisplay(agency.crm_number)}</span>
                        ) : (
                          <button
                            onClick={(e) => openCrmPanel(agency, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-navy-600 bg-navy-600/5 border border-navy-600/20 rounded-lg hover:bg-navy-600/10 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            Assign
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[agency.onboarding_status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[agency.onboarding_status] || agency.onboarding_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(agency.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{filledSeats[agency.name] || 0}</span>
                          <span className="text-xs text-gray-400">/ 200</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={(e) => toggleActive(agency, e)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            agency.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              agency.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddAgencyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadAgencies(); }}
        />
      )}

      {csrPanelAgency && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCsrPanelAgency(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-steel-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-navy-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Assign CSR</h3>
                  <p className="text-xs text-gray-500">{csrPanelAgency.name}</p>
                </div>
              </div>
              <button onClick={() => setCsrPanelAgency(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={csrForm.firstName}
                    onChange={(e) => setCsrForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={csrForm.lastName}
                    onChange={(e) => setCsrForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={csrForm.phone}
                    onChange={(e) => setCsrForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={csrForm.email}
                    onChange={(e) => setCsrForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                    placeholder="csr@example.com"
                  />
                </div>
              </div>

              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NPN <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={csrForm.npn}
                  onChange={(e) => setCsrForm((f) => ({ ...f, npn: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                  placeholder="National Producer Number"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setCsrPanelAgency(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCsrDetails}
                disabled={csrSaving || !csrForm.firstName.trim() || !csrForm.lastName.trim() || !csrForm.phone.trim() || !csrForm.email.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                {csrSaving ? 'Saving...' : 'Save CSR Info'}
              </button>
            </div>
          </div>
        </div>
      )}

      {crmPanelAgency && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCrmPanelAgency(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Assign CRM #</h3>
                  <p className="text-xs text-gray-500">{crmPanelAgency.name}</p>
                </div>
              </div>
              <button onClick={() => setCrmPanelAgency(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">CRM Number</label>
              <input
                type="text"
                value={crmNumberValue}
                onChange={(e) => setCrmNumberValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && crmNumberValue.trim()) saveCrmNumber(); }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="e.g. 720-594-2854"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-400">This will auto-fill into all 200 roster rows for this agency.</p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setCrmPanelAgency(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCrmNumber}
                disabled={crmSaving || !crmNumberValue.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                {crmSaving ? 'Saving...' : 'Save & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
