import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, UserPlus, UserX, X, AlertTriangle, Building2, Pencil, Send, Copy, Check as CheckIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fireCrmOnboardingWebhook } from '../../lib/webhooks';
import type { CrmAgency } from '../../lib/supabase';

interface PortalAgentsTabProps {
  agency: CrmAgency;
  agencyIds: string[];
  agencyNames: string[];
}

type RosterAgent = {
  id: string;
  row_data: Record<string, string>;
  agencyName: string;
  uploadId: string;
};

export const PortalAgentsTab: React.FC<PortalAgentsTabProps> = ({ agency, agencyIds: _agencyIds, agencyNames }) => {
  const [agents, setAgents] = useState<RosterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RosterAgent | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<RosterAgent | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [terminateError, setTerminateError] = useState('');
  const [showInviteBanner, setShowInviteBanner] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const hasMultipleAgencies = agencyNames.length > 1;

  const intakeInviteUrl = (() => {
    const base = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin;
    return `${base}/agency-intake?from=${agency.id}&agency=${encodeURIComponent(agency.name)}`;
  })();

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(intakeInviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  };

  const loadAgents = useCallback(async () => {
    const { data: uploads } = await supabase
      .from('crm_roster_uploads')
      .select('id, agency')
      .in('agency', agencyNames)
      .order('uploaded_at', { ascending: false });

    if (!uploads || uploads.length === 0) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const latestPerAgency = new Map<string, { id: string; agency: string }>();
    for (const u of uploads) {
      if (!latestPerAgency.has(u.agency)) {
        latestPerAgency.set(u.agency, u);
      }
    }

    const allAgents: RosterAgent[] = [];
    for (const [agName, upload] of latestPerAgency) {
      const { data: rows } = await supabase
        .from('crm_roster')
        .select('id, row_data')
        .eq('upload_id', upload.id);

      const populated = (rows || [])
        .filter((r) => r.row_data['First Name']?.trim() && r.row_data['CSR Placeholder'] !== 'true')
        .map((r) => ({ ...r, agencyName: agName, uploadId: upload.id }));

      allAgents.push(...populated);
    }

    allAgents.sort((a, b) => {
      const aNum = parseInt(a.row_data['Seat Number'] || '', 10);
      const bNum = parseInt(b.row_data['Seat Number'] || '', 10);
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });

    setAgents(allAgents);
    setLoading(false);
  }, [agencyNames.join(',')]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleTerminate = async () => {
    if (!terminateTarget) return;
    setTerminating(true);
    setTerminateError('');

    try {
      const firstName = terminateTarget.row_data['First Name'] || '';
      const lastName = terminateTarget.row_data['Last Name'] || '';
      const email = terminateTarget.row_data['Email'] || '';
      const targetAgencyName = terminateTarget.agencyName || agency.name;

      const { data: agencyData } = await supabase
        .from('hierarchy_agencies')
        .select('csr_can_fill_seat, csr_first_name, csr_last_name, csr_phone, csr_email, csr_npn, csr_gender, zaps_paused')
        .eq('name', targetAgencyName)
        .maybeSingle();

      const csrCanFill = agencyData?.csr_can_fill_seat && agencyData?.csr_npn?.trim();

      if (csrCanFill) {
        const genderLower = (agencyData.csr_gender || '').toLowerCase();
        const csrProfileImage = genderLower === 'male' ? MALE_PROFILE_IMAGE : genderLower === 'female' ? FEMALE_PROFILE_IMAGE : '';
        const csrRowData = {
          ...terminateTarget.row_data,
          'First Name': agencyData.csr_first_name || '',
          'Last Name': agencyData.csr_last_name || '',
          'Phone': agencyData.csr_phone || '',
          'phone': agencyData.csr_phone || '',
          'Email': agencyData.csr_email || '',
          'email': agencyData.csr_email || '',
          'Agent NPN': agencyData.csr_npn || '',
          'All Templates | Agent Profile Image': csrProfileImage,
          'CSR Placeholder': 'true',
        };

        const { error: updateError } = await supabase
          .from('crm_roster')
          .update({ row_data: csrRowData })
          .eq('id', terminateTarget.id);

        if (updateError) {
          setTerminateError('Failed to update roster seat. Please try again.');
          setTerminating(false);
          return;
        }

        if (!agencyData.zaps_paused) {
          const crmNumber = terminateTarget.row_data['All Templates | Agent CRM #'] || '';
          await fireCrmOnboardingWebhook({
            seatNumber: terminateTarget.row_data['Seat Number'] || '',
            agentNpn: agencyData.csr_npn || '',
            firstName: agencyData.csr_first_name || '',
            lastName: agencyData.csr_last_name || '',
            email: agencyData.csr_email || '',
            phone: agencyData.csr_phone || '',
            profileImage: csrProfileImage,
            crmNumber,
            agency: targetAgencyName,
          });
        }
      } else {
        const clearedRowData = {
          ...terminateTarget.row_data,
          'First Name': '',
          'Last Name': '',
          'Phone': '',
          'phone': '',
          'Email': '',
          'email': '',
          'Agent NPN': '',
          'All Templates | Agent Profile Image': '',
          'CSR Placeholder': '',
        };

        const { error: updateError } = await supabase
          .from('crm_roster')
          .update({ row_data: clearedRowData })
          .eq('id', terminateTarget.id);

        if (updateError) {
          setTerminateError('Failed to clear roster seat. Please try again.');
          setTerminating(false);
          return;
        }
      }

      // Mark matching agents as terminated
      const now = new Date().toISOString();

      const { data: matchingAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('status', 'completed')
        .eq('agency', targetAgencyName)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .ilike('email', email);

      if (matchingAgents && matchingAgents.length > 0) {
        for (const agent of matchingAgents) {
          await supabase
            .from('agents')
            .update({ status: 'terminated', crm_onboarded: false, terminated_at: now, updated_at: now })
            .eq('id', agent.id);

          await supabase
            .from('crm_pipeline')
            .update({ terminated_at: now, updated_at: now })
            .eq('agent_id', agent.id);

          await supabase
            .from('crm_pipeline_history')
            .update({ terminated_at: now, final_stage: 'terminated' })
            .eq('agent_id', agent.id);
        }
      }

      const agentNpn = terminateTarget.row_data['Agent NPN'] || '';
      await supabase.from('crm_termination_log').insert({
        agent_name: `${firstName} ${lastName}`.trim(),
        agent_npn: agentNpn,
        status: 'terminated',
        agency: targetAgencyName,
        terminated_at: now,
      });

      await loadAgents();
      setTerminateTarget(null);
    } catch {
      setTerminateError('An unexpected error occurred. Please try again.');
    } finally {
      setTerminating(false);
    }
  };

  const filtered = agents.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const d = r.row_data;
    return (
      (d['First Name'] || '').toLowerCase().includes(q) ||
      (d['Last Name'] || '').toLowerCase().includes(q) ||
      (d['Email'] || '').toLowerCase().includes(q) ||
      (d['Phone'] || '').toLowerCase().includes(q) ||
      (d['Agent NPN'] || '').toLowerCase().includes(q) ||
      r.agencyName.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Sub-Agency Invite ── */}
      <div className="bg-navy-50 border border-navy-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-navy-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Invite a Sub-Agency to Contract</p>
              <p className="text-xs text-navy-600 mt-0.5">
                Send this link to an agency you want to bring into your downline. They fill out the intake form and our team handles setup.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteBanner(v => !v)}
            className="text-xs font-medium text-navy-700 hover:text-navy-900 flex-shrink-0"
          >
            {showInviteBanner ? 'Hide' : 'Get Link'}
          </button>
        </div>

        {showInviteBanner && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={intakeInviteUrl}
              className="flex-1 px-3 py-2 text-xs border border-navy-300 rounded-lg bg-white text-steel-700 font-mono focus:outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors flex-shrink-0"
            >
              {inviteCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {inviteCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
            />
          </div>
          <p className="text-sm text-steel-500 font-medium">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      <div className="bg-white rounded-xl border border-steel-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50 border-b border-steel-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">First Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Last Name</th>
                {hasMultipleAgencies && (
                  <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Agency</th>
                )}
                <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-steel-600 uppercase tracking-wider">NPN</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-steel-50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-steel-900">
                    {row.row_data['First Name'] || ''}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-steel-900">
                    {row.row_data['Last Name'] || ''}
                  </td>
                  {hasMultipleAgencies && (
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-steel-600">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-steel-100 rounded text-xs font-medium text-steel-700">
                        <Building2 className="w-3 h-3" />
                        {row.agencyName}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-steel-600">
                    {row.row_data['Email'] || ''}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-steel-600">
                    {row.row_data['Phone'] || ''}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-steel-600 font-mono">
                    {row.row_data['Agent NPN'] || '--'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditTarget(row)}
                        className="p-1.5 text-steel-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                        title="Edit agent"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTerminateTarget(row)}
                        className="p-1.5 text-steel-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Terminate agent"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={hasMultipleAgencies ? 7 : 6} className="px-6 py-12 text-center">
                    <Users className="w-8 h-8 text-steel-300 mx-auto mb-2" />
                    <p className="text-sm text-steel-500">
                      {agents.length === 0 ? 'No agents yet. Upload a roster or add your first agent.' : 'No agents match your search.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddAgentModal
          agency={agency}
          agencyNames={agencyNames}
          hasMultipleAgencies={hasMultipleAgencies}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadAgents(); }}
        />
      )}

      {editTarget && (
        <EditAgentModal
          target={editTarget}
          agency={agency}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); loadAgents(); }}
        />
      )}

      {terminateTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-steel-200">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-steel-900">Terminate Agent</h3>
                <p className="text-xs text-steel-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-steel-700 text-sm">
                Are you sure you want to terminate{' '}
                <span className="font-semibold">
                  {terminateTarget.row_data['First Name']} {terminateTarget.row_data['Last Name']}
                </span>?
                Their seat will be released on the roster.
              </p>
              {terminateError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{terminateError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-steel-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => { setTerminateTarget(null); setTerminateError(''); }}
                disabled={terminating}
                className="px-4 py-2 text-sm font-medium text-steel-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {terminating ? 'Terminating...' : 'Terminate Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d23303840127a970fb.png';
const FEMALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d2f665866357dfd218.png';

const EditAgentModal: React.FC<{
  target: RosterAgent;
  agency: CrmAgency;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ target, agency, onClose, onSuccess }) => {
  const currentImage = target.row_data['All Templates | Agent Profile Image'] || '';
  const initialGender = currentImage === FEMALE_PROFILE_IMAGE ? 'Female' : currentImage === MALE_PROFILE_IMAGE ? 'Male' : '';

  const [form, setForm] = useState({
    firstName: target.row_data['First Name'] || '',
    lastName: target.row_data['Last Name'] || '',
    email: target.row_data['Email'] || '',
    phone: target.row_data['Phone'] || '',
    gender: initialGender,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const npn = target.row_data['Agent NPN'] || '';
  const targetAgencyName = target.agencyName || agency.name;

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim() || !form.gender) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const profileImage = form.gender === 'Male' ? MALE_PROFILE_IMAGE : FEMALE_PROFILE_IMAGE;

      // Update the crm_roster row (single source of truth for portal + CRM team).
      const updatedRowData = {
        ...target.row_data,
        'First Name': form.firstName.trim(),
        'Last Name': form.lastName.trim(),
        'Phone': form.phone.trim(),
        'phone': form.phone.trim(),
        'Email': form.email.trim(),
        'email': form.email.trim(),
        'All Templates | Agent Profile Image': profileImage,
      };

      const { error: updateError } = await supabase
        .from('crm_roster')
        .update({ row_data: updatedRowData })
        .eq('id', target.id);

      if (updateError) {
        setError('Failed to save changes. Please try again.');
        setSubmitting(false);
        return;
      }

      // Create a CRM work order so the CRM team can re-fire the onboarding Zap.
      const { data: agencyRecord } = await supabase
        .from('hierarchy_agencies')
        .select('id')
        .eq('name', targetAgencyName)
        .maybeSingle();

      if (agencyRecord?.id) {
        const agentName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
        await supabase.from('crm_tickets').insert({
          agency_id: agencyRecord.id,
          subject: `Roster edit -- ${agentName}`,
          description: `${targetAgencyName} edited roster seat #${target.row_data['Seat Number'] || ''} for ${agentName}. Review and Send to Zap to push the update.`,
          category: 'agent-issue',
          status: 'open',
          priority: 'normal',
          submitted_by: targetAgencyName,
          order_type: 'roster-edit',
          roster_row_id: target.id,
        });
      }

      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center border border-navy-100">
              <Pencil className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h3 className="font-semibold text-steel-900">Edit Agent</h3>
              <p className="text-xs text-steel-500">Creates a work order for the CRM team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                NPN
              </label>
              <input
                type="text"
                value={npn || '--'}
                readOnly
                disabled
                className="w-full px-4 py-2.5 border border-steel-200 rounded-lg bg-steel-50 text-steel-500 text-sm cursor-not-allowed"
                title="NPN cannot be edited"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-700 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateField('gender', 'Male')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Male'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => updateField('gender', 'Female')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Female'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-steel-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddAgentModal: React.FC<{
  agency: CrmAgency;
  agencyNames: string[];
  hasMultipleAgencies: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ agency, agencyNames, hasMultipleAgencies, onClose, onSuccess }) => {
  const [selectedAgencyName, setSelectedAgencyName] = useState(
    hasMultipleAgencies ? '' : (agencyNames[0] || agency.name)
  );
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    npn: '',
    gender: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAgencyName) {
      setError('Please select an agency.');
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim() || !form.npn.trim() || !form.gender) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: upload } = await supabase
        .from('crm_roster_uploads')
        .select('id, row_count')
        .eq('agency', selectedAgencyName)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!upload) {
        setError(`No roster found for ${selectedAgencyName}. Please upload a roster first.`);
        setSubmitting(false);
        return;
      }

      const activeUploadId = upload.id;

      const { data: allRows, error: rosterReadError } = await supabase
        .from('crm_roster')
        .select('id, row_data')
        .eq('upload_id', activeUploadId);

      // Guard: if the read errored out, fail loudly rather than silently
      // inserting a duplicate seat. This catches RLS/grant misconfigurations
      // that cause a null/empty result even when rows exist.
      if (rosterReadError) {
        setError('Failed to read roster. Please try again or contact support.');
        setSubmitting(false);
        return;
      }

      const numericRows = (allRows || []).filter(
        (r) => /^\d+$/.test(r.row_data['Seat Number'] || '')
      );

      // Guard: if upload.row_count > 0 but we got 0 numericRows, something is
      // wrong with our read access. Fail rather than creating a duplicate seat.
      if (numericRows.length === 0 && (upload as any).row_count > 0) {
        setError('Could not read roster seats. Please refresh and try again.');
        setSubmitting(false);
        return;
      }

      const openSeat = numericRows
        .filter((r) => !r.row_data['First Name']?.trim() || r.row_data['CSR Placeholder'] === 'true')
        .sort((a, b) => Number(a.row_data['Seat Number']) - Number(b.row_data['Seat Number']))[0];

      let crmNumber = '';
      const rowWithCrm = numericRows.find((r) => r.row_data['All Templates | Agent CRM #']?.trim());
      if (rowWithCrm) {
        crmNumber = rowWithCrm.row_data['All Templates | Agent CRM #'];
      }

      const { data: agencyRecord } = await supabase
        .from('hierarchy_agencies')
        .select('zaps_paused, is_alumni, calendar_embed_code, agency_url_prefix')
        .eq('name', selectedAgencyName)
        .maybeSingle();

      let seatNumber: string;

      const profileImage = form.gender === 'Male' ? MALE_PROFILE_IMAGE : FEMALE_PROFILE_IMAGE;

      if (openSeat) {
        seatNumber = openSeat.row_data['Seat Number'];
        const updatedRowData = {
          ...openSeat.row_data,
          'First Name': form.firstName.trim(),
          'Last Name': form.lastName.trim(),
          'Phone': form.phone.trim(),
          'phone': form.phone.trim(),
          'Email': form.email.trim(),
          'email': form.email.trim(),
          'Agent NPN': form.npn.trim(),
          'All Templates | Agent CRM #': crmNumber,
          'All Templates | Agent Profile Image': profileImage,
          'CSR Placeholder': '',
        };

        const { error: updateError } = await supabase
          .from('crm_roster')  
          .update({ row_data: updatedRowData })
          .eq('id', openSeat.id);

        if (updateError) {
          setError('Failed to assign seat. Please try again.');
          setSubmitting(false);
          return;
        }
      } else {
        // All seats are occupied — extend the roster beyond the current max.
        // Compute the next seat number that is not already present in the DB
        // to prevent duplicates if this branch has been triggered before.
        const occupiedSeats = new Set(numericRows.map((r) => Number(r.row_data['Seat Number'])));
        let nextSeat = (numericRows.reduce((max, r) => Math.max(max, Number(r.row_data['Seat Number'])), 0)) + 1;
        // Walk forward until we find a seat number that doesn't already exist
        while (occupiedSeats.has(nextSeat)) nextSeat++;
        seatNumber = String(nextSeat);

        const urlPrefix = agencyRecord?.agency_url_prefix?.trim() || '';
        const newRowData: Record<string, string> = {
          'Seat Number': seatNumber,
          'First Name': form.firstName.trim(),
          'Last Name': form.lastName.trim(),
          'Phone': form.phone.trim(),
          'phone': form.phone.trim(),
          'Email': form.email.trim(),
          'email': form.email.trim(),
          'Agent NPN': form.npn.trim(),
          'All Templates | Agent CRM #': crmNumber,
          'All Templates | Agent Profile Image': profileImage,
          'Calendar Embed Code': agencyRecord?.calendar_embed_code?.trim() || '',
          'Digital Business Card Home Page': urlPrefix ? `${urlPrefix}.my-agent-appt.com/r${seatNumber}-click-to-schedule` : '',
          'Appt Booked Confirmation Page': urlPrefix ? `${urlPrefix}.my-agent-appt.com/r${seatNumber}-youre-confirmed` : '',
        };

        const { error: insertError } = await supabase
          .from('crm_roster')
          .insert({ upload_id: activeUploadId, row_data: newRowData });

        if (insertError) {
          setError('Failed to create roster seat. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      // Fire Zap webhook if not paused
      if (!agencyRecord?.zaps_paused) {
        let calendarEmbedCode = '';
        let digitalBusinessCardUrl = '';
        let confirmationPageUrl = '';

        if (!agencyRecord?.is_alumni) {
          calendarEmbedCode = agencyRecord?.calendar_embed_code?.trim() || '';
          const urlPrefix = agencyRecord?.agency_url_prefix?.trim() || '';
          if (urlPrefix) {
            digitalBusinessCardUrl = `${urlPrefix}.my-agent-appt.com/r${seatNumber}-click-to-schedule`;
            confirmationPageUrl = `${urlPrefix}.my-agent-appt.com/r${seatNumber}-youre-confirmed`;
          }
        }

        await fireCrmOnboardingWebhook({
          seatNumber,
          agentNpn: form.npn.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          profileImage,
          crmNumber,
          agency: selectedAgencyName,
          calendarEmbedCode,
          digitalBusinessCardUrl,
          confirmationPageUrl,
        });
      }

      const now = new Date().toISOString();
      const autoAdvance = new Date(Date.now() + 3 * 60 * 1000).toISOString();

      const { data: pipelineData } = await supabase.from('crm_pipeline').insert({
        agency: selectedAgencyName,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        agent_npn: form.npn.trim(),
        seat_number: seatNumber,
        crm_number: crmNumber,
        stage: 'processing',
        zap_sent_at: now,
        auto_advance_at: autoAdvance,
      }).select('id').maybeSingle();

      if (pipelineData) {
        await supabase.from('crm_pipeline_history').insert({
          pipeline_record_id: pipelineData.id,
          agency: selectedAgencyName,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          agent_npn: form.npn.trim(),
          seat_number: seatNumber,
          crm_number: crmNumber,
          final_stage: 'processing',
          zap_sent_at: now,
          entered_at: now,
        });
      }

      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center border border-navy-100">
              <UserPlus className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h3 className="font-semibold text-steel-900">Add New Agent</h3>
              <p className="text-xs text-steel-500">Agent will be assigned to the nearest open seat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {hasMultipleAgencies && (
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">
                Agency <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {agencyNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { setSelectedAgencyName(name); setError(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                      selectedAgencyName === name
                        ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                        : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50 hover:border-steel-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">
                NPN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.npn}
                onChange={(e) => updateField('npn', e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
                placeholder="National Producer Number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-steel-700 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateField('gender', 'Male')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Male'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => updateField('gender', 'Female')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  form.gender === 'Female'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-steel-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
