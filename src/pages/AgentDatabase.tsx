import React, { useState, useEffect } from 'react';
import { Eye, X, Download, UserPlus, CheckCircle, FileDown, Undo2, UserX, Database, GitBranch } from 'lucide-react';
import { supabase, Agent, FormSubmission, UploadedFile, AgentLobAssignment, formatPhoneDisplay } from '../lib/supabase';
import { LobAssignment } from '../components/LobAssignment';
import { fireCrmOnboardingWebhook } from '../lib/webhooks';
import { AgentPipelineBoard } from './agent-database/AgentPipelineBoard';

const MALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d23303840127a970fb.png';
const FEMALE_PROFILE_IMAGE = 'https://storage.googleapis.com/msgsndr/YM9XmCanfO6p28b1sQOH/media/6882b3d2f665866357dfd218.png';

export const AgentDatabase: React.FC = () => {
  const [activeView, setActiveView] = useState<'database' | 'pipeline'>('database');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, FormSubmission>>({});
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [formTypeFilter, setFormTypeFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [lobAssignments, setLobAssignments] = useState<Record<string, AgentLobAssignment[]>>({});
  const [crmConfirmAgent, setCrmConfirmAgent] = useState<Agent | null>(null);
  const [crmSubmitting, setCrmSubmitting] = useState(false);
  const [crmStep, setCrmStep] = useState<'gender' | 'confirm'>('confirm');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [crmError, setCrmError] = useState<string>('');
  const [undoConfirmAgent, setUndoConfirmAgent] = useState<Agent | null>(null);
  const [undoSubmitting, setUndoSubmitting] = useState(false);
  const [undoError, setUndoError] = useState('');
  const [terminateAgent, setTerminateAgent] = useState<Agent | null>(null);
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);
  const [terminateError, setTerminateError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchName, searchCode, formTypeFilter, agencyFilter]);

  const loadData = async () => {
    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'completed')
      .order('date_completed', { ascending: false });

    if (agentData) {
      setAgents(agentData);

      const { data: submissionData } = await supabase
        .from('form_submissions')
        .select('*')
        .in('agent_id', agentData.map(a => a.id));

      if (submissionData) {
        const submissionsMap: Record<string, FormSubmission> = {};
        submissionData.forEach(sub => {
          submissionsMap[sub.agent_id] = sub;
        });
        setSubmissions(submissionsMap);
      }

      const { data: lobData } = await supabase
        .from('agent_lob_assignments')
        .select('*')
        .in('agent_id', agentData.map(a => a.id));

      if (lobData) {
        const lobMap: Record<string, AgentLobAssignment[]> = {};
        lobData.forEach((row: AgentLobAssignment) => {
          if (!lobMap[row.agent_id]) lobMap[row.agent_id] = [];
          lobMap[row.agent_id].push(row);
        });
        setLobAssignments(lobMap);
      }
    }
  };

  const filterAgents = () => {
    let filtered = [...agents];

    if (searchName) {
      filtered = filtered.filter(
        (a) =>
          a.first_name.toLowerCase().includes(searchName.toLowerCase()) ||
          a.last_name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (searchCode) {
      filtered = filtered.filter((a) => a.security_code.includes(searchCode));
    }

    if (formTypeFilter) {
      filtered = filtered.filter((a) => a.form_type === formTypeFilter);
    }

    if (agencyFilter) {
      filtered = filtered.filter((a) => a.agency === agencyFilter);
    }

    setFilteredAgents(filtered);
  };

  const handleView = async (agent: Agent) => {
    setSelectedSubmission(null);
    setFiles([]);
    setSelectedAgent(agent);
    setSelectedSubmission(submissions[agent.id] || null);

    const { data: fileData } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('agent_id', agent.id);

    setFiles(fileData || []);
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
    setSelectedSubmission(null);
    setFiles([]);
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.file_data;
    link.download = file.file_name;
    link.click();
  };

  const handleExportCsv = () => {
    const escapeField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headerRow = ['Agent First Name', 'Agent Last Name', 'Agent NPN', 'UNL Writing Number', 'GTL Writing Number', 'Phone'];
    const csvRows = [headerRow.join(',')];

    filteredAgents.forEach((agent) => {
      const submission = submissions[agent.id];
      const lobs = lobAssignments[agent.id] || [];
      const unlRow = lobs.find((l) => l.carrier === 'UNL');
      const gtlRow = lobs.find((l) => l.carrier === 'GTL');

      csvRows.push([
        escapeField(agent.first_name),
        escapeField(agent.last_name),
        escapeField(submission?.npn || ''),
        escapeField(unlRow?.writing_number || ''),
        escapeField(gtlRow?.writing_number || ''),
        escapeField(formatPhoneDisplay(agent.phone)),
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startCrmOnboarding = (agent: Agent) => {
    const submission = submissions[agent.id];
    const gender = submission?.gender;
    setCrmError('');
    setCrmConfirmAgent(agent);
    if (!gender) {
      setCrmStep('gender');
      setSelectedGender('');
    } else {
      setCrmStep('confirm');
      setSelectedGender(gender);
    }
  };

  const handleGenderSelected = (gender: string) => {
    setSelectedGender(gender);
    setCrmStep('confirm');
  };

  const handleCrmConfirm = async () => {
    if (!crmConfirmAgent) return;
    setCrmSubmitting(true);
    setCrmError('');

    try {
      const agency = crmConfirmAgent.agency;
      const submission = submissions[crmConfirmAgent.id];
      const gender = selectedGender;
      const profileImage = gender === 'Male' ? MALE_PROFILE_IMAGE : FEMALE_PROFILE_IMAGE;

      const { data: upload } = await supabase
        .from('crm_roster_uploads')
        .select('id, headers')
        .eq('agency', agency)
        .maybeSingle();

      if (!upload) {
        setCrmError(`No CRM roster found for ${agency}. Please upload a roster first.`);
        setCrmSubmitting(false);
        return;
      }

      const { data: openSeats } = await supabase
        .from('crm_roster')
        .select('id, row_data')
        .eq('upload_id', upload.id);

      const numericRows = (openSeats || []).filter(
        (r) => /^\d+$/.test(r.row_data['Seat Number'] || '')
      );

      const openSeat = numericRows
        .filter((r) => !r.row_data['First Name']?.trim() || r.row_data['CSR Placeholder'] === 'true')
        .sort((a, b) => Number(a.row_data['Seat Number']) - Number(b.row_data['Seat Number']))[0];

      let crmNumber = '';
      const rowWithCrm = numericRows.find((r) => r.row_data['All Templates | Agent CRM #']?.trim());
      if (rowWithCrm) {
        crmNumber = rowWithCrm.row_data['All Templates | Agent CRM #'];
      }

      let seatNumber: string;

      if (openSeat) {
        seatNumber = openSeat.row_data['Seat Number'];
        const updatedRowData = {
          ...openSeat.row_data,
          'First Name': crmConfirmAgent.first_name,
          'Last Name': crmConfirmAgent.last_name,
          'Phone': crmConfirmAgent.phone,
          'Email': crmConfirmAgent.email,
          'Agent NPN': submission?.npn || '',
          'All Templates | Agent Profile Image': profileImage,
          'All Templates | Agent CRM #': crmNumber,
          'CSR Placeholder': '',
        };

        const { data: updatedRows, error: updateError } = await supabase
          .from('crm_roster')
          .update({ row_data: updatedRowData })
          .eq('id', openSeat.id)
          .select();

        if (updateError || !updatedRows || updatedRows.length === 0) {
          setCrmError('Failed to update roster seat. Please try again.');
          setCrmSubmitting(false);
          return;
        }
      } else {
        const maxSeat = numericRows.reduce(
          (max, r) => Math.max(max, Number(r.row_data['Seat Number'])),
          0
        );
        seatNumber = String(maxSeat + 1);

        const newRowData: Record<string, string> = {
          'Seat Number': seatNumber,
          'First Name': crmConfirmAgent.first_name,
          'Last Name': crmConfirmAgent.last_name,
          'Phone': crmConfirmAgent.phone,
          'Email': crmConfirmAgent.email,
          'Agent NPN': submission?.npn || '',
          'All Templates | Agent Profile Image': profileImage,
          'All Templates | Agent CRM #': crmNumber,
        };

        const { error: insertError } = await supabase
          .from('crm_roster')
          .insert({ upload_id: upload.id, row_data: newRowData });

        if (insertError) {
          setCrmError('Failed to create roster seat. Please try again.');
          setCrmSubmitting(false);
          return;
        }
      }

      const { data: zapCheck } = await supabase
        .from('crm_agencies')
        .select('zaps_paused')
        .eq('name', agency)
        .maybeSingle();

      if (!zapCheck?.zaps_paused) {
        const webhookSuccess = await fireCrmOnboardingWebhook({
          seatNumber,
          agentNpn: submission?.npn || '',
          firstName: crmConfirmAgent.first_name,
          lastName: crmConfirmAgent.last_name,
          email: crmConfirmAgent.email,
          phone: crmConfirmAgent.phone,
          profileImage,
          crmNumber,
          agency,
        });

        if (!webhookSuccess) {
          setCrmError('Seat assigned but webhook failed. Please contact support.');
        }
      }

      const { error } = await supabase
        .from('agents')
        .update({ crm_onboarded: true })
        .eq('id', crmConfirmAgent.id);

      if (!error) {
        setAgents(prev =>
          prev.map(a => a.id === crmConfirmAgent.id ? { ...a, crm_onboarded: true } : a)
        );
      }

      const now = new Date().toISOString();
      const autoAdvanceAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { data: pipelineData } = await supabase.from('crm_pipeline').insert({
        agent_id: crmConfirmAgent.id,
        agency,
        first_name: crmConfirmAgent.first_name,
        last_name: crmConfirmAgent.last_name,
        email: crmConfirmAgent.email,
        phone: crmConfirmAgent.phone,
        seat_number: seatNumber,
        crm_number: crmNumber,
        agent_npn: submission?.npn || '',
        stage: 'processing',
        zap_sent_at: now,
        user_created_at: now,
        seat_filled_at: now,
        auto_advance_at: autoAdvanceAt,
      }).select('id').maybeSingle();

      if (pipelineData) {
        await supabase.from('crm_pipeline_history').insert({
          pipeline_record_id: pipelineData.id,
          agent_id: crmConfirmAgent.id,
          agency,
          first_name: crmConfirmAgent.first_name,
          last_name: crmConfirmAgent.last_name,
          email: crmConfirmAgent.email,
          phone: crmConfirmAgent.phone,
          seat_number: seatNumber,
          crm_number: crmNumber,
          agent_npn: submission?.npn || '',
          final_stage: 'processing',
          zap_sent_at: now,
          user_created_at: now,
          seat_filled_at: now,
          entered_at: now,
        });
      }

      setCrmSubmitting(false);
      setCrmConfirmAgent(null);
      setCrmStep('confirm');
      setSelectedGender('');
    } catch {
      setCrmError('An unexpected error occurred. Please try again.');
      setCrmSubmitting(false);
    }
  };

  const isTestMitchell = (agent: Agent) =>
    agent.first_name.toLowerCase() === 'tester' && agent.last_name.toLowerCase() === 'mitchell';

  const handleCrmUndo = async () => {
    if (!undoConfirmAgent) return;
    setUndoSubmitting(true);
    setUndoError('');

    try {
      const agency = undoConfirmAgent.agency;

      const { data: upload } = await supabase
        .from('crm_roster_uploads')
        .select('id')
        .eq('agency', agency)
        .maybeSingle();

      if (upload) {
        const { data: rosterRows } = await supabase
          .from('crm_roster')
          .select('id, row_data')
          .eq('upload_id', upload.id);

        const matchingRows = (rosterRows || []).filter(
          (r) =>
            r.row_data['First Name']?.toLowerCase() === 'tester' &&
            r.row_data['Last Name']?.toLowerCase() === 'mitchell'
        );

        for (const row of matchingRows) {
          const clearedRowData = {
            ...row.row_data,
            'First Name': '',
            'Last Name': '',
            'Phone': '',
            'Email': '',
            'Agent NPN': '',
            'All Templates | Agent Profile Image': '',
          };

          await supabase
            .from('crm_roster')
            .update({ row_data: clearedRowData })
            .eq('id', row.id);
        }
      }

      await supabase
        .from('agents')
        .update({ crm_onboarded: false })
        .eq('id', undoConfirmAgent.id);

      setAgents(prev =>
        prev.map(a => a.id === undoConfirmAgent.id ? { ...a, crm_onboarded: false } : a)
      );

      setUndoSubmitting(false);
      setUndoConfirmAgent(null);
    } catch {
      setUndoError('An unexpected error occurred. Please try again.');
      setUndoSubmitting(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminateAgent) return;
    setTerminateSubmitting(true);
    setTerminateError('');

    try {
      const agency = terminateAgent.agency;

      const { data: upload } = await supabase
        .from('crm_roster_uploads')
        .select('id, headers')
        .eq('agency', agency)
        .maybeSingle();

      if (upload) {
        const { data: rosterRows } = await supabase
          .from('crm_roster')
          .select('id, row_data')
          .eq('upload_id', upload.id);

        const matchingRow = (rosterRows || []).find(
          (r) =>
            (r.row_data['First Name'] || '').toLowerCase() === terminateAgent.first_name.toLowerCase() &&
            (r.row_data['Last Name'] || '').toLowerCase() === terminateAgent.last_name.toLowerCase() &&
            (r.row_data['Email'] || '').toLowerCase() === terminateAgent.email.toLowerCase()
        );

        if (matchingRow) {
          const { data: agencyData } = await supabase
            .from('crm_agencies')
            .select('csr_can_fill_seat, csr_first_name, csr_last_name, csr_phone, csr_email, csr_npn, csr_gender, zaps_paused')
            .eq('name', agency)
            .maybeSingle();

          const csrCanFill = agencyData?.csr_can_fill_seat && agencyData?.csr_npn?.trim();

          if (csrCanFill) {
            const csrProfileImage = agencyData.csr_gender === 'Male' ? MALE_PROFILE_IMAGE : agencyData.csr_gender === 'Female' ? FEMALE_PROFILE_IMAGE : '';
            const csrRowData = {
              ...matchingRow.row_data,
              'First Name': agencyData.csr_first_name || '',
              'Last Name': agencyData.csr_last_name || '',
              'Phone': agencyData.csr_phone || '',
              'Email': agencyData.csr_email || '',
              'Agent NPN': agencyData.csr_npn || '',
              'All Templates | Agent Profile Image': csrProfileImage,
              'CSR Placeholder': 'true',
            };
            await supabase
              .from('crm_roster')
              .update({ row_data: csrRowData })
              .eq('id', matchingRow.id);

            const numericRows = (rosterRows || []).filter(
              (r) => /^\d+$/.test(r.row_data['Seat Number'] || '')
            );
            const rowWithCrm = numericRows.find((r) => r.row_data['All Templates | Agent CRM #']?.trim());
            const crmNumber = rowWithCrm?.row_data['All Templates | Agent CRM #'] || '';

            if (!agencyData.zaps_paused) {
              await fireCrmOnboardingWebhook({
                seatNumber: matchingRow.row_data['Seat Number'] || '',
                agentNpn: agencyData.csr_npn || '',
                firstName: agencyData.csr_first_name || '',
                lastName: agencyData.csr_last_name || '',
                email: agencyData.csr_email || '',
                phone: agencyData.csr_phone || '',
                profileImage: csrProfileImage,
                crmNumber,
                agency,
              });
            }
          } else {
            const clearedRowData = {
              ...matchingRow.row_data,
              'First Name': '',
              'Last Name': '',
              'Phone': '',
              'Email': '',
              'Agent NPN': '',
              'All Templates | Agent Profile Image': '',
              'CSR Placeholder': '',
            };
            await supabase
              .from('crm_roster')
              .update({ row_data: clearedRowData })
              .eq('id', matchingRow.id);
          }
        }
      }

      const now = new Date().toISOString();

      await supabase
        .from('agents')
        .update({ status: 'terminated', crm_onboarded: false, terminated_at: now, updated_at: now })
        .eq('id', terminateAgent.id);

      await supabase
        .from('crm_pipeline')
        .update({ terminated_at: now, updated_at: now })
        .eq('agent_id', terminateAgent.id);

      await supabase
        .from('crm_pipeline_history')
        .update({ terminated_at: now, final_stage: 'terminated' })
        .eq('agent_id', terminateAgent.id);

      setAgents(prev => prev.filter(a => a.id !== terminateAgent.id));
      setTerminateSubmitting(false);
      setTerminateAgent(null);
    } catch {
      setTerminateError('An unexpected error occurred. Please try again.');
      setTerminateSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-600">Agent Database</h1>
          <p className="text-gray-600 mt-1">Complete repository of all contracted agents</p>
        </div>
        {activeView === 'database' && (
          <button
            onClick={handleExportCsv}
            disabled={filteredAgents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-lg font-medium hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-steel-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'database'
              ? 'bg-white text-navy-700 shadow-sm'
              : 'text-steel-500 hover:text-steel-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Database
        </button>
        <button
          onClick={() => setActiveView('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'pipeline'
              ? 'bg-white text-navy-700 shadow-sm'
              : 'text-steel-500 hover:text-steel-700'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          New Agent Pipeline
        </button>
      </div>

      {activeView === 'pipeline' ? (
        <AgentPipelineBoard />
      ) : (
      <>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by agent name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Search by security code..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
          <select
            value={formTypeFilter}
            onChange={(e) => setFormTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          >
            <option value="">All Form Types</option>
            <option value="life-only">Life Only</option>
            <option value="field">Field</option>
            <option value="direct-pay">Direct Pay</option>
            <option value="telesales">Telesales</option>
            <option value="hip-career">HIP Career</option>
            <option value="hip-broker">HIP Broker</option>
            <option value="hip">HIP (Legacy)</option>
            <option value="field-hip">Field HIP</option>
            <option value="direct-pay-hip">Direct Pay HIP</option>
            <option value="telesales-hip">Telesales HIP</option>
          </select>
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          >
            <option value="">All Agencies</option>
            <option value="FYM">FYM</option>
            <option value="Wisechoice">Wisechoice</option>
            <option value="Aspire">Aspire</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">Agent Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Security Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NPN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAgents.map((agent) => {
                const submission = submissions[agent.id];
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer text-navy-600 hover:underline"
                      onClick={() => handleView(agent)}
                    >
                      {agent.first_name} {agent.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{agent.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatPhoneDisplay(agent.phone)}</td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {agent.form_type.replace('-', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{agent.agency}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{agent.security_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {agent.date_completed ? new Date(agent.date_completed).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{submission?.npn || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{submission?.resident_state || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <div className="relative group/view">
                          <button
                            onClick={() => handleView(agent)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            aria-label={`View details for ${agent.first_name} ${agent.last_name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none">
                            View Details
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                          </span>
                        </div>
                        <div className="relative group/crm">
                          {agent.crm_onboarded ? (
                            <span
                              className="p-1.5 inline-flex text-emerald-600 cursor-default"
                              aria-label={`CRM submitted for ${agent.first_name} ${agent.last_name}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => startCrmOnboarding(agent)}
                              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition-colors"
                              aria-label={`Start CRM onboarding for ${agent.first_name} ${agent.last_name}`}
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/crm:opacity-100 transition-opacity pointer-events-none">
                            {agent.crm_onboarded ? 'CRM Submitted' : 'CRM Onboarding'}
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                          </span>
                        </div>
                        {agent.crm_onboarded && isTestMitchell(agent) && (
                          <div className="relative group/undo">
                            <button
                              onClick={() => { setUndoError(''); setUndoConfirmAgent(agent); }}
                              className="p-1.5 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                              aria-label={`Undo CRM for ${agent.first_name} ${agent.last_name}`}
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/undo:opacity-100 transition-opacity pointer-events-none">
                              Undo CRM (Test Only)
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                            </span>
                          </div>
                        )}
                        {agent.crm_onboarded && (
                          <div className="relative group/terminate">
                            <button
                              onClick={() => { setTerminateError(''); setTerminateAgent(agent); }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              aria-label={`Terminate ${agent.first_name} ${agent.last_name}`}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/terminate:opacity-100 transition-opacity pointer-events-none">
                              Terminate Agent
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-navy-600">Agent Details</h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-navy-600 text-lg mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Agent Name:</span>
                    <p className="font-medium">{selectedAgent.first_name} {selectedAgent.last_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedAgent.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone Number:</span>
                    <p className="font-medium">{formatPhoneDisplay(selectedAgent.phone)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Security Code:</span>
                    <p className="font-medium font-mono">{selectedAgent.security_code}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Form Type:</span>
                    <p className="font-medium capitalize">{selectedAgent.form_type.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date Completed:</span>
                    <p className="font-medium">
                      {selectedAgent.date_completed ? new Date(selectedAgent.date_completed).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <LobAssignment
                agentId={selectedAgent.id}
                agentFirstName={selectedAgent.first_name}
                agentLastName={selectedAgent.last_name}
                agentNpn={submissions[selectedAgent.id]?.npn || ''}
              />

              {selectedSubmission && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-navy-600 text-lg mb-4">Form Submission Data</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedSubmission.agent_type && (
                      <div>
                        <span className="text-gray-600">Agent Type:</span>
                        <p className="font-medium">{selectedSubmission.agent_type}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Date of Birth:</span>
                      <p className="font-medium">{selectedSubmission.date_of_birth}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Social Security Number:</span>
                      <p className="font-medium font-mono">
                        {selectedSubmission.ssn.slice(0, 3)}-{selectedSubmission.ssn.slice(3, 5)}-{selectedSubmission.ssn.slice(5, 9)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Address:</span>
                      <p className="font-medium">
                        {selectedSubmission.address}, {selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.postal_code}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Resident License Number:</span>
                      <p className="font-medium">{selectedSubmission.resident_license_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">NPN:</span>
                      <p className="font-medium">{selectedSubmission.npn}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Resident State:</span>
                      <p className="font-medium">{selectedSubmission.resident_state}</p>
                    </div>
                    {selectedSubmission.ctm_acknowledgment && (
                      <div>
                        <span className="text-gray-600">CTM Acknowledgment:</span>
                        <p className="font-medium">{selectedSubmission.ctm_acknowledgment}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Release Needed:</span>
                      <p className="font-medium">{selectedSubmission.release_needed}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Selected State Licenses:</span>
                      <p className="font-medium">{selectedSubmission.state_licenses.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-navy-600 text-lg mb-4">Uploaded Files</h3>
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                          <p className="font-medium">{file.file_name}</p>
                          <p className="text-sm text-gray-600">{file.file_type}</p>
                        </div>
                        <button
                          onClick={() => downloadFile(file)}
                          className="flex items-center text-navy-600 hover:text-navy-700 font-medium"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-navy-600 text-lg mb-4">Uploaded Files</h3>
                  <p className="text-gray-500 text-center py-4">No files uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {undoConfirmAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-orange-600">Undo CRM Onboarding</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will clear the CRM seat data for <span className="font-semibold">{undoConfirmAgent.first_name} {undoConfirmAgent.last_name}</span> and
                allow re-onboarding.
              </p>
              <p className="text-gray-500 text-sm mt-2">This is a test-only action.</p>
              {undoError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{undoError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => { setUndoConfirmAgent(null); setUndoError(''); }}
                disabled={undoSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCrmUndo}
                disabled={undoSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {undoSubmitting ? 'Clearing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {crmConfirmAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-navy-600">
                {crmStep === 'gender' ? 'Select Gender' : 'CRM Onboarding Confirmation'}
              </h2>
            </div>

            {crmStep === 'gender' ? (
              <>
                <div className="px-6 py-5">
                  <p className="text-gray-700 mb-4">
                    Gender is required for <span className="font-semibold">{crmConfirmAgent.first_name} {crmConfirmAgent.last_name}</span>.
                    Please select their gender to continue.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleGenderSelected('Male')}
                      className="flex-1 px-4 py-3 text-sm font-medium border-2 border-gray-200 rounded-lg hover:border-navy-600 hover:bg-blue-50 transition-colors"
                    >
                      Male
                    </button>
                    <button
                      onClick={() => handleGenderSelected('Female')}
                      className="flex-1 px-4 py-3 text-sm font-medium border-2 border-gray-200 rounded-lg hover:border-navy-600 hover:bg-blue-50 transition-colors"
                    >
                      Female
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
                  <button
                    onClick={() => { setCrmConfirmAgent(null); setCrmStep('confirm'); setSelectedGender(''); setCrmError(''); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-5">
                  <p className="text-gray-700">
                    This will assign a CRM seat and send <span className="font-semibold">{crmConfirmAgent.first_name} {crmConfirmAgent.last_name}</span>'s
                    information to the Onboarding team for CRM processing.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
                  {crmError && (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{crmError}</p>
                  )}
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                  <button
                    onClick={() => { setCrmConfirmAgent(null); setCrmStep('confirm'); setSelectedGender(''); setCrmError(''); }}
                    disabled={crmSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCrmConfirm}
                    disabled={crmSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-50"
                  >
                    {crmSubmitting ? 'Assigning Seat...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {terminateAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-red-600">Terminate Agent</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700">
                This will terminate <span className="font-semibold">{terminateAgent.first_name} {terminateAgent.last_name}</span>,
                clear their seat from the <span className="font-semibold">{terminateAgent.agency}</span> CRM roster,
                and mark them as terminated.
              </p>
              <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
              {terminateError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{terminateError}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => { setTerminateAgent(null); setTerminateError(''); }}
                disabled={terminateSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminateSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {terminateSubmitting ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
