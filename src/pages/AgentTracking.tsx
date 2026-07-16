import React, { useState, useEffect } from 'react';
import { Eye, RefreshCw, Trash2, X, Download, CreditCard as Edit } from 'lucide-react';
import { supabase, Agent, AgentIntakeRecord, UploadedFile, formatPhoneDisplay } from '../lib/supabase';

export const AgentTracking: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formTypeFilter, setFormTypeFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [submission, setSubmission] = useState<AgentIntakeRecord | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    agency: ''
  });
  const itemsPerPage = 50;

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchTerm, statusFilter, formTypeFilter, agencyFilter]);

  const loadAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('date_sent', { ascending: false });

    if (data) {
      setAgents(data);
    }
  };

  const filterAgents = () => {
    let filtered = [...agents];

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.phone.includes(searchTerm) ||
          a.security_code.includes(searchTerm)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (formTypeFilter) {
      filtered = filtered.filter((a) => a.form_type === formTypeFilter);
    }

    if (agencyFilter) {
      filtered = filtered.filter((a) => a.agency === agencyFilter);
    }

    setFilteredAgents(filtered);
    setCurrentPage(1);
  };

  const handleView = async (agent: Agent) => {
    setSubmission(null);
    setFiles([]);
    setSelectedAgent(agent);

    if (agent.status === 'completed') {
      const { data: subData } = await supabase
        .from('agent_intake')
        .select('*')
        .eq('agent_id', agent.id)
        .maybeSingle();

      const { data: fileData } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('agent_id', agent.id);

      setSubmission(subData);
      setFiles(fileData || []);
    }
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
    setSubmission(null);
    setFiles([]);
  };

  const handleResend = async (agent: Agent) => {
    if (!confirm('Resend link and generate new security code?')) return;

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiration = new Date();
    newExpiration.setHours(newExpiration.getHours() + 72);

    await supabase
      .from('agents')
      .update({
        security_code: newCode,
        status: 'pending',
        expiration_date: newExpiration.toISOString(),
      })
      .eq('id', agent.id);

    await supabase.from('activity_log').insert({
      agent_id: agent.id,
      action: 'link_resent',
      details: `Link resent for ${agent.first_name} ${agent.last_name}`,
    });

    loadAgents();
    alert(`New security code: ${newCode}`);
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm('Delete this agent record?')) return;

    await supabase.from('agents').delete().eq('id', agent.id);

    await supabase.from('activity_log').insert({
      agent_id: null,
      action: 'agent_deleted',
      details: `Agent ${agent.first_name} ${agent.last_name} deleted`,
    });

    loadAgents();
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      first_name: agent.first_name,
      last_name: agent.last_name,
      phone: agent.phone,
      agency: agent.agency
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAgent) return;

    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      alert('First name and last name are required');
      return;
    }

    if (!editForm.phone.trim()) {
      alert('Phone number is required');
      return;
    }

    if (!editForm.agency) {
      alert('Please select an agency');
      return;
    }

    const { error } = await supabase
      .from('agents')
      .update({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim(),
        agency: editForm.agency
      })
      .eq('id', editingAgent.id);

    if (error) {
      alert('Failed to update agent. Please try again.');
      console.error(error);
      return;
    }

    await supabase.from('activity_log').insert({
      agent_id: editingAgent.id,
      action: 'agent_updated',
      details: `Agent updated: ${editForm.first_name} ${editForm.last_name}`,
    });

    setEditingAgent(null);
    loadAgents();
    alert('Agent updated successfully');
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setEditForm({
      first_name: '',
      last_name: '',
      phone: '',
      agency: ''
    });
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.file_data;
    link.download = file.file_name;
    link.click();
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const exportData = [];

      for (const agent of filteredAgents) {
        let submissionData: AgentIntakeRecord | null = null;

        if (agent.status === 'completed') {
          const { data } = await supabase
            .from('agent_intake')
            .select('*')
            .eq('agent_id', agent.id)
            .maybeSingle();
          submissionData = data;
        }

        const stateLicenses = submissionData?.state_licenses
          ? (Array.isArray(submissionData.state_licenses)
              ? submissionData.state_licenses.join('; ')
              : String(submissionData.state_licenses))
          : '';

        const releaseNeeded = submissionData?.release_needed || 'No';
        const ctmAcknowledgment = submissionData?.ctm_acknowledgment || 'No';

        exportData.push({
          'First Name': agent.first_name,
          'Last Name': agent.last_name,
          'Email': agent.email,
          'Phone': agent.phone,
          'Form Type': agent.form_type.replace('-', ' '),
          'Agency': agent.agency,
          'Security Code': agent.security_code,
          'Status': agent.status,
          'Date Sent': new Date(agent.date_sent).toLocaleDateString(),
          'Date Completed': agent.date_completed ? new Date(agent.date_completed).toLocaleDateString() : '',
          'Expiration Date': new Date(agent.expiration_date).toLocaleDateString(),
          'Agent Type': submissionData?.agent_type || '',
          'Date of Birth': submissionData?.date_of_birth || '',
          'SSN': submissionData?.ssn || '',
          'Address': submissionData?.address || '',
          'City': submissionData?.city || '',
          'State': submissionData?.state || '',
          'Postal Code': submissionData?.postal_code || '',
          'NPN': submissionData?.npn || '',
          'Resident License Number': submissionData?.resident_license_number || '',
          'Resident State': submissionData?.resident_state || '',
          'State Licenses': stateLicenses,
          'Release Needed': releaseNeeded,
          'CTM Acknowledgment': ctmAcknowledgment,
        });
      }

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            const stringValue = value != null ? String(value) : '';
            return `"${stringValue.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];

      link.setAttribute('href', url);
      link.setAttribute('download', `agent-tracking-export-${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || '';
  };

  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600">Intake Form Tracking</h1>
        <p className="text-gray-600 mt-1">Monitor agent progress through contracting</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name, email, phone, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
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
        <div className="flex justify-end">
          <button
            onClick={exportToCSV}
            disabled={isExporting || filteredAgents.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-md hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Security Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.first_name} {agent.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatPhoneDisplay(agent.phone)}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">
                    {agent.form_type.replace('-', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{agent.agency}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono">{agent.security_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(agent.status)}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(agent.date_sent).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.date_completed ? new Date(agent.date_completed).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(agent)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(agent)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResend(agent)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Resend"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAgents.length)} of {filteredAgents.length} agents
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-3">Agent Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{selectedAgent.first_name} {selectedAgent.last_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <p className="font-medium">{formatPhoneDisplay(selectedAgent.phone)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{selectedAgent.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Form Type:</span>
                    <p className="font-medium capitalize">{selectedAgent.form_type.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Agency:</span>
                    <p className="font-medium">{selectedAgent.agency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Security Code:</span>
                    <p className="font-medium font-mono">{selectedAgent.security_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedAgent.status)}`}>
                      {selectedAgent.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Form Submission Data</h3>
                {selectedAgent.status === 'completed' && submission ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {submission.agent_type && (
                      <div>
                        <span className="text-gray-600">Agent Type:</span>
                        <p className="font-medium">{submission.agent_type}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Date of Birth:</span>
                      <p className="font-medium">{submission.date_of_birth}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Social Security Number:</span>
                      <p className="font-medium font-mono">
                        {submission.ssn.slice(0, 3)}-{submission.ssn.slice(3, 5)}-{submission.ssn.slice(5, 9)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">NPN:</span>
                      <p className="font-medium">{submission.npn}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Address:</span>
                      <p className="font-medium">
                        {submission.address}, {submission.city}, {submission.state} {submission.postal_code}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Resident License:</span>
                      <p className="font-medium">{submission.resident_license_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Resident State:</span>
                      <p className="font-medium">{submission.resident_state}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Release Needed:</span>
                      <p className="font-medium">{submission.release_needed}</p>
                    </div>
                    {submission.ctm_acknowledgment && (
                      <div>
                        <span className="text-gray-600">CTM Acknowledgment:</span>
                        <p className="font-medium">{submission.ctm_acknowledgment}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-600">State Licenses:</span>
                      <p className="font-medium">{submission.state_licenses.join(', ')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    {selectedAgent.status === 'pending' && 'Form not yet submitted'}
                    {selectedAgent.status === 'in-progress' && 'Form in progress — not yet submitted'}
                    {selectedAgent.status === 'expired' && 'Form link expired — no submission received'}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Uploaded Files</h3>
                {selectedAgent.status === 'completed' && files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm">{file.file_name}</span>
                        <button
                          onClick={() => downloadFile(file)}
                          className="flex items-center text-navy-600 hover:text-navy-700 text-sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No files uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-navy-600">Edit Agent</h2>
              <button onClick={handleCancelEdit} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agency
                </label>
                <select
                  value={editForm.agency}
                  onChange={(e) => setEditForm({ ...editForm, agency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                >
                  <option value="">Select Agency</option>
                  <option value="FYM">FYM</option>
                  <option value="Wisechoice">Wisechoice</option>
                  <option value="Aspire">Aspire</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-navy-600 text-white rounded-md hover:bg-navy-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
