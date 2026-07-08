import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Send,
  CheckCircle,
  AlertCircle,
  Info,
  UserPlus,
  FileText,
  Trash2,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { supabase, formatPhoneDisplay } from '../lib/supabase';
import { firePopulateWebhook } from '../lib/webhooks';

interface NewHire {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  form_type: string;
  agency: string;
  processed: boolean;
  created_at: string;
}

const STORED_TO_DISPLAY_FORM_TYPE: Record<string, string> = {
  'hip': 'HIP',
  'hip-career': 'HIP Career',
  'hip-broker': 'HIP Broker',
  'life-only': 'Life Only',
  'field': 'Field',
  'direct-pay': 'Direct Pay (Telesales)',
  'telesales': 'Telesales',
};

export const AgentIntake: React.FC = () => {
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [hiresLoading, setHiresLoading] = useState(true);
  const [hiresError, setHiresError] = useState<string | null>(null);
  const [hiresSuccess, setHiresSuccess] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [integrationOpen, setIntegrationOpen] = useState(false);

  const [showDomainWarning, setShowDomainWarning] = useState(false);
  const [showPrefilledNotice, setShowPrefilledNotice] = useState(false);
  const [selectedHireId, setSelectedHireId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    formType: '',
    agency: 'FYM',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [generated, setGenerated] = useState<{
    url: string;
    code: string;
    emailBody: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    formType: string;
    agency: string;
    expirationDate: string;
    newHireId: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [webhookSent, setWebhookSent] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const fetchNewHires = async () => {
    try {
      setHiresLoading(true);
      setHiresError(null);

      const { data, error } = await supabase
        .from('new_hires')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewHires(data || []);
    } catch {
      setHiresError('Failed to load new hires. Please try again.');
    } finally {
      setHiresLoading(false);
    }
  };

  useEffect(() => {
    fetchNewHires();

    const channel = supabase
      .channel('new_hires_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'new_hires' },
        () => { fetchNewHires(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_APP_URL;
    const currentOrigin = window.location.origin;
    if (configuredUrl && configuredUrl !== currentOrigin && !configuredUrl.includes('localhost')) {
      setShowDomainWarning(true);
    }
  }, []);

  const handleUseForForm = (hire: NewHire) => {
    const prefilledFormType = hire.form_type
      ? (STORED_TO_DISPLAY_FORM_TYPE[hire.form_type] || '')
      : '';

    setFormData({
      formType: prefilledFormType,
      agency: hire.agency || 'FYM',
      firstName: hire.first_name,
      lastName: hire.last_name,
      email: hire.email,
      phone: hire.phone_number,
    });

    setSelectedHireId(hire.id);
    setShowPrefilledNotice(true);
    setQueueOpen(false);
    setGenerated(null);
    setWebhookSent(false);
    setWebhookError(null);
  };

  const handleDeleteHire = async (id: string) => {
    if (!confirm('Are you sure you want to delete this new hire record?')) return;

    try {
      const { error } = await supabase.from('new_hires').delete().eq('id', id);
      if (error) throw error;
      setHiresSuccess('New hire deleted successfully');
      setTimeout(() => setHiresSuccess(null), 3000);
    } catch {
      setHiresError('Failed to delete new hire');
      setTimeout(() => setHiresError(null), 3000);
    }
  };

  const formatHireDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateSecurityCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const generateFormUrl = (formType: string, agentId: string) => {
    const configuredUrl = import.meta.env.VITE_APP_URL;
    const baseUrl = configuredUrl || window.location.origin;
    const typeMap: Record<string, string> = {
      'Life Only': '/life',
      'Field': '/field',
      'Direct Pay (Telesales)': '/direct-pay',
      'Telesales': '/telesales',
      'HIP': '/hip',
      'HIP Career': '/hip-career',
      'HIP Broker': '/hip-broker',
    };
    return `${baseUrl}${typeMap[formType]}?id=${agentId}`;
  };

  const generateEmailBody = (firstName: string, lastName: string, url: string, code: string, agency: string) => {
    const agencyEmails: Record<string, string> = {
      'FYM': 'Contracting@teamFYM.com',
      'Wisechoice': 'contracting@wisechoice.com',
      'Aspire': 'contracting@aspire.com',
    };
    const agencyNames: Record<string, string> = {
      'FYM': 'FYM Financial',
      'Wisechoice': 'Wisechoice',
      'Aspire': 'Aspire',
    };

    return `Dear ${firstName} ${lastName},

Thank you for your interest in joining our team! We're excited to move forward with your contracting process.

Please complete your agent intake form using the information below:

Form URL: ${url}

Security Code: ${code}

IMPORTANT INSTRUCTIONS:
1. Click the form URL above to access your personalized intake form
2. When prompted, enter the security code provided above
3. Complete all required fields accurately - ensure all information matches your NIPR license details
4. Upload any required documentation
5. Submit the form within 72 hours (the link will expire after this time)

If you experience any issues or have questions, please contact us at ${agencyEmails[agency] || agencyEmails['FYM']}

We look forward to working with you!

Best regards,
The Contracting Team
${agencyNames[agency] || agencyNames['FYM']}`;
  };

  const getSubjectLine = () => 'Your Agent Intake Form - Action Required';

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const securityCode = generateSecurityCode();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 72);

      const formTypeMap: Record<string, string> = {
        'Life Only': 'life-only',
        'Field': 'field',
        'Direct Pay (Telesales)': 'direct-pay',
        'Telesales': 'telesales',
        'HIP': 'hip',
        'HIP Career': 'hip-career',
        'HIP Broker': 'hip-broker',
      };

      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          form_type: formTypeMap[formData.formType],
          agency: formData.agency,
          security_code: securityCode,
          status: 'pending',
          expiration_date: expirationDate.toISOString(),
          form_url: 'temp',
        })
        .select()
        .single();

      if (error) throw error;

      const formUrl = generateFormUrl(formData.formType, agent.id);

      await supabase
        .from('agents')
        .update({ form_url: formUrl })
        .eq('id', agent.id);

      await supabase.from('activity_log').insert({
        agent_id: agent.id,
        action: 'form_created',
        details: `Form created for ${formData.firstName} ${formData.lastName}`,
      });

      const emailBody = generateEmailBody(
        formData.firstName,
        formData.lastName,
        formUrl,
        securityCode,
        formData.agency
      );

      setGenerated({
        url: formUrl,
        code: securityCode,
        emailBody,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        formType: formTypeMap[formData.formType],
        agency: formData.agency,
        expirationDate: expirationDate.toISOString(),
        newHireId: selectedHireId,
      });

      setWebhookSent(false);
      setWebhookError(null);

      setFormData({
        formType: '',
        agency: 'FYM',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
      setSelectedHireId(null);
      setShowPrefilledNotice(false);
    } catch {
      alert('Error creating form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForm = async () => {
    if (!generated) return;
    setSendingWebhook(true);
    setWebhookError(null);

    try {
      await firePopulateWebhook({
        firstName: generated.firstName,
        lastName: generated.lastName,
        email: generated.email,
        phone: generated.phone,
        formType: generated.formType,
        agency: generated.agency,
        generatedUrl: generated.url,
        securityCode: generated.code,
        expirationDate: generated.expirationDate,
      });

      if (generated.newHireId) {
        await supabase
          .from('new_hires')
          .update({ processed: true })
          .eq('id', generated.newHireId);
      }

      setWebhookSent(true);
    } catch {
      setWebhookError('Failed to send form to agent. Please try again.');
    } finally {
      setSendingWebhook(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600">Agent Intake</h1>
        <p className="text-gray-600 mt-1">Process new hires and generate agent intake forms</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <button
          onClick={() => setQueueOpen(!queueOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-navy-600" />
            <span className="font-semibold text-navy-600 text-lg">New Hires Queue</span>
            {newHires.length > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy-600 text-white">
                {newHires.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchNewHires(); }}
              disabled={hiresLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${hiresLoading ? 'animate-spin' : ''}`} />
            </button>
            {queueOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </button>

        {queueOpen && (
          <div className="border-t border-gray-200">
            {hiresError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-800">{hiresError}</p>
              </div>
            )}

            {hiresSuccess && (
              <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-green-800">{hiresSuccess}</p>
              </div>
            )}

            {hiresLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading new hires...</p>
              </div>
            ) : newHires.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600 mb-1">No pending new hires</p>
                <p className="text-xs text-gray-400">New agents will appear here automatically from GoHighLevel</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {newHires.map((hire) => (
                      <tr key={hire.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {hire.first_name} {hire.last_name}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{hire.email}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{formatPhoneDisplay(hire.phone_number)}</td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                            {hire.form_type || '--'}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{hire.agency || '--'}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{formatHireDate(hire.created_at)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUseForForm(hire)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy-600 text-white rounded hover:bg-navy-700 transition-colors text-sm"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Use for Form
                            </button>
                            <button
                              onClick={() => handleDeleteHire(hire.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-gray-100">
              <button
                onClick={() => setIntegrationOpen(!integrationOpen)}
                className="w-full flex items-center gap-2 px-6 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                <span className="font-medium">Integration Settings</span>
                {integrationOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {integrationOpen && (
                <div className="px-6 pb-4 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 text-sm mb-1">Webhook URL:</h4>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 block break-all">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/new-hire-webhook
                    </code>
                  </div>
                  <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                    <li>Create a Zap in Zapier with GHL as the trigger</li>
                    <li>Set the trigger event to when a candidate is moved to "Hired"</li>
                    <li>Add a "Webhooks by Zapier" action with POST method</li>
                    <li>Use the webhook URL above</li>
                    <li>Set Content-Type to "application/json"</li>
                    <li>Map fields: firstName, lastName, email, phoneNumber, form_type, agency</li>
                    <li>Test the Zap and turn it on</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showDomainWarning && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Domain Configuration Notice</h3>
              <p className="text-sm text-blue-800 mb-2">
                You are accessing the admin portal from a different domain than configured.
                Generated form URLs will use: <span className="font-mono font-semibold">{import.meta.env.VITE_APP_URL || window.location.origin}</span>
              </p>
              <p className="text-xs text-blue-700">
                Make sure this matches your production domain and that environment variables are configured in Bolt.new.
              </p>
            </div>
            <button onClick={() => setShowDomainWarning(false)} className="text-blue-600 hover:text-blue-800 ml-2">
              x
            </button>
          </div>
        </div>
      )}

      {!import.meta.env.VITE_APP_URL && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">VITE_APP_URL Not Configured</h3>
              <p className="text-sm text-amber-800 mb-2">
                Form URLs will use the current domain (<span className="font-mono">{window.location.origin}</span>).
                For production, set <span className="font-mono">VITE_APP_URL</span> in your .env file and Bolt.new environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {showPrefilledNotice && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-1">Agent Data Pre-filled from New Hires</h3>
              <p className="text-sm text-green-800">
                Form has been populated with agent information. Form type has been pre-selected where available -- review and submit when ready.
              </p>
            </div>
            <button onClick={() => setShowPrefilledNotice(false)} className="text-green-600 hover:text-green-800 ml-2">
              x
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
              <select
                value={formData.formType}
                onChange={(e) => setFormData({ ...formData, formType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              >
                <option value=""></option>
                <option value="Life Only">Life Only</option>
                <option value="Direct Pay (Telesales)">Direct Pay (Telesales)</option>
                <option value="Field">Field</option>
                <option value="Telesales">Telesales</option>
                <option value="HIP Career">HIP Career</option>
                <option value="HIP Broker">HIP Broker</option>
                <option value="HIP">HIP (Legacy)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
              <select
                value={formData.agency}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              >
                <option value="FYM">FYM</option>
                <option value="Wisechoice">Wisechoice</option>
                <option value="Aspire">Aspire</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-600 text-white py-3 px-4 rounded-md hover:bg-navy-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Intake Form'}
            </button>
          </form>
        </div>

        {generated && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy-600">Generated Form Details</h2>
              {webhookSent && (
                <div className="flex items-center text-green-600 font-medium">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sent to Agent
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form URL</label>
              <div className="flex gap-2">
                <input type="text" value={generated.url} readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50" />
                <button onClick={() => handleCopy(generated.url, 'url')} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                  {copied === 'url' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Code</label>
              <div className="flex gap-2">
                <input type="text" value={generated.code} readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-lg" />
                <button onClick={() => handleCopy(generated.code, 'code')} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                  {copied === 'code' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                <button
                  onClick={() => handleCopy(getSubjectLine(), 'subject')}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {copied === 'subject' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy Subject
                </button>
              </div>
              <input type="text" value={getSubjectLine()} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Email Template</label>
                <button
                  onClick={() => handleCopy(generated.emailBody, 'email')}
                  className="flex items-center px-3 py-1 text-sm bg-gold-500 text-white rounded-md hover:bg-gold-600 transition-colors"
                >
                  {copied === 'email' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy Email Body
                </button>
              </div>
              <textarea value={generated.emailBody} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm h-64" />
            </div>

            {webhookError && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{webhookError}</span>
              </div>
            )}

            {!webhookSent && (
              <button
                onClick={handleSendForm}
                disabled={sendingWebhook}
                className="w-full bg-gold-500 text-white py-3 px-4 rounded-md hover:bg-gold-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {sendingWebhook ? (
                  <span>Sending to Agent...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send to Agent
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
