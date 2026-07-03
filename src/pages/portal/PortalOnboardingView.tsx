import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Upload,
  Download,
  FileSpreadsheet,
  UserCheck,
  Database,
  Shield,
  Phone,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency, CrmTemplate } from '../../lib/supabase';
import { parseCSV } from '../../lib/csvParser';
import { escapeField, padRosterTo200 } from '../crm/onboardingHelpers';
import { normalizeRosterRows, ROSTER_TEMPLATE_HEADERS } from '../../lib/rosterNormalizer';

const DBA_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Carrier',
  'Agent First Name',
  'Agent Full Name',
  'Agent NPN',
  'Effective Date',
];

interface PortalOnboardingViewProps {
  agency: CrmAgency;
  onRefresh: () => Promise<void>;
}

type StepKey = 'csr' | 'setup' | 'roster' | 'dba';

const STEPS: { key: StepKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'csr', label: 'CSR Assignment', icon: UserCheck },
  { key: 'setup', label: 'Account Setup', icon: Clock },
  { key: 'roster', label: 'Agent Roster Upload', icon: Upload },
  { key: 'dba', label: 'DBA Client Roster Upload', icon: Database },
];

function getActiveStepIndex(agency: CrmAgency): number {
  if (agency.onboarding_status === 'onboarding_complete') return 4;
  if (agency.onboarding_status === 'awaiting_dba_upload') return 3;
  if (agency.onboarding_status === 'awaiting_roster_upload') return 2;
  if (agency.onboarding_status === 'awaiting_agency_phone') return 1;
  return 0;
}

function getPortalStepState(
  stepIdx: number,
  activeIdx: number,
  agency: CrmAgency
): 'locked' | 'active' | 'submitted' | 'complete' {
  if (stepIdx > activeIdx) return 'locked';
  if (stepIdx < activeIdx) return 'complete';
  if (stepIdx === 0 && agency.assigned_csr?.trim()) return 'submitted';
  return 'active';
}

export const PortalOnboardingView: React.FC<PortalOnboardingViewProps> = ({ agency, onRefresh }) => {
  const activeIdx = getActiveStepIndex(agency);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(activeIdx === 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(onRefresh, 30000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Your Agency Portal</h2>
        <p className="text-sm text-gray-500 mt-2">
          Complete the onboarding steps below to unlock your full portal. Each step must be
          confirmed by our team before the next one becomes available.
        </p>
      </div>

      {activeIdx < 4 && (
        <OnboardingOverview expanded={overviewExpanded} onToggle={() => setOverviewExpanded(!overviewExpanded)} />
      )}

      <Stepper activeIdx={activeIdx} agency={agency} />

      <div className="mt-8 space-y-6">
        {STEPS.map((step, idx) => {
          const state = getPortalStepState(idx, activeIdx, agency);
          return (
            <StepCard key={step.key} step={step} stepNumber={idx + 1} state={state}>
              {state === 'locked' && <LockedContent />}
              {state === 'complete' && <CompleteContent stepKey={step.key} agency={agency} />}
              {(state === 'active' || state === 'submitted') && idx === 0 && (
                <CsrForm agency={agency} onRefresh={onRefresh} />
              )}
              {state === 'active' && idx === 1 && (
                <AccountSetupWaiting />
              )}
              {state === 'active' && idx === 2 && (
                <RosterUpload agency={agency} onRefresh={onRefresh} />
              )}
              {state === 'active' && idx === 3 && (
                <DbaUpload agency={agency} onRefresh={onRefresh} />
              )}
            </StepCard>
          );
        })}
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Need help? Contact us at{' '}
        <a href="mailto:Contracting@teamFYM.com" className="text-navy-600 hover:underline font-medium">
          Contracting@teamFYM.com
        </a>
      </p>
    </div>
  );
};

const Stepper: React.FC<{ activeIdx: number; agency: CrmAgency }> = ({ activeIdx, agency }) => (
  <div className="flex items-center justify-between relative">
    <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 mx-12" />
    {STEPS.map((step, idx) => {
      const state = getPortalStepState(idx, activeIdx, agency);
      const Icon = step.icon;
      return (
        <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              state === 'complete'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : state === 'submitted'
                  ? 'bg-amber-50 border-amber-400 text-amber-600'
                  : state === 'active'
                    ? 'bg-navy-600 border-navy-600 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
            }`}
          >
            {state === 'complete' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : state === 'submitted' ? (
              <Clock className="w-5 h-5" />
            ) : state === 'locked' ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
          </div>
          <span
            className={`text-xs font-medium mt-2 text-center ${
              state === 'complete'
                ? 'text-emerald-600'
                : state === 'submitted'
                  ? 'text-amber-600'
                  : state === 'active'
                    ? 'text-navy-600'
                    : 'text-gray-400'
            }`}
          >
            {step.label}
          </span>
          {state === 'submitted' && (
            <span className="text-[10px] text-amber-500 mt-0.5">Awaiting confirmation</span>
          )}
        </div>
      );
    })}
  </div>
);

const StepCard: React.FC<{
  step: (typeof STEPS)[number];
  stepNumber: number;
  state: 'locked' | 'active' | 'submitted' | 'complete';
  children: React.ReactNode;
}> = ({ step, stepNumber, state, children }) => {
  const Icon = step.icon;
  return (
    <div
      className={`rounded-xl border transition-all ${
        state === 'locked'
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : state === 'complete'
            ? 'bg-white border-emerald-200'
            : state === 'submitted'
              ? 'bg-white border-amber-200'
              : 'bg-white border-navy-600/30 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            state === 'complete'
              ? 'bg-emerald-50'
              : state === 'submitted'
                ? 'bg-amber-50'
                : state === 'active'
                  ? 'bg-blue-50'
                  : 'bg-gray-100'
          }`}
        >
          {state === 'complete' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : state === 'locked' ? (
            <Lock className="w-4 h-4 text-gray-400" />
          ) : (
            <Icon
              className={`w-5 h-5 ${
                state === 'submitted' ? 'text-amber-600' : 'text-navy-600'
              }`}
            />
          )}
        </div>
        <div className="flex-1">
          <h3
            className={`font-semibold ${
              state === 'locked' ? 'text-gray-400' : 'text-gray-900'
            }`}
          >
            Step {stepNumber}: {step.label}
          </h3>
          {state === 'complete' && (
            <p className="text-xs text-emerald-600">Confirmed by our team</p>
          )}
          {state === 'submitted' && (
            <p className="text-xs text-amber-600">Submitted -- awaiting confirmation</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

const LockedContent: React.FC = () => (
  <div className="flex items-center gap-3 text-gray-400">
    <Lock className="w-5 h-5 flex-shrink-0" />
    <p className="text-sm">This step will unlock after the previous step is confirmed by our team.</p>
  </div>
);

const AccountSetupWaiting: React.FC = () => (
  <div className="flex items-center gap-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
    <Clock className="w-5 h-5 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium">Your account is being set up by our team</p>
      <p className="text-xs text-amber-600 mt-0.5">This will be completed shortly. You will be notified when the next step is ready.</p>
    </div>
  </div>
);

const OVERVIEW_STEPS = [
  {
    icon: UserCheck,
    label: 'CSR Assignment',
    description: 'Tell us about your Customer Service Representative. This person will serve as the primary support contact for your clients and help manage day-to-day communications.',
    template: null,
  },
  {
    icon: Phone,
    label: 'Account Setup',
    description: 'Our team will configure your dedicated account and communication channels. No action is needed from you during this step.',
    template: null,
  },
  {
    icon: Upload,
    label: 'Agent Roster Upload',
    description: 'This agent roster will be used to populate the CRM with your agents for customized messaging.',
    template: 'roster' as const,
  },
  {
    icon: Database,
    label: 'DBA Client Roster Upload',
    description: 'Upload your DBA client list so we can set up personalized outreach to your current BoB.',
    template: 'dba' as const,
  },
];

const OnboardingOverview: React.FC<{ expanded: boolean; onToggle: () => void }> = ({ expanded, onToggle }) => {
  const downloadRosterTemplate = () => {
    const csvHeader = ROSTER_TEMPLATE_HEADERS.map(escapeField).join(',');
    const blob = new Blob([csvHeader + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agent_roster_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadDbaTemplate = () => {
    const csvHeader = DBA_TEMPLATE_HEADERS.map(escapeField).join(',');
    const blob = new Blob([csvHeader + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dba_client_roster_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-8 rounded-xl border border-sky-200/60 bg-sky-50/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-sky-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-sky-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Onboarding Overview</h3>
            <p className="text-xs text-gray-500">What to expect and how to prepare</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-2">
          <div className="space-y-4">
            {OVERVIEW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Step {idx + 1}: {step.label}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                    {step.template === 'roster' && (
                      <button
                        onClick={downloadRosterTemplate}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-white border border-sky-200 rounded-md hover:bg-sky-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Agent Roster Template
                      </button>
                    )}
                    {step.template === 'dba' && (
                      <button
                        onClick={downloadDbaTemplate}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-white border border-sky-200 rounded-md hover:bg-sky-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download DBA Client Roster Template
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-5 pt-4 border-t border-sky-200/50">
            Download templates now to prepare your data ahead of time. Each step will guide you through submission when it becomes active.
          </p>
        </div>
      )}
    </div>
  );
};

const CompleteContent: React.FC<{ stepKey: StepKey; agency: CrmAgency }> = ({ stepKey, agency }) => {
  if (stepKey === 'csr') {
    const name = [agency.csr_first_name, agency.csr_last_name].filter(Boolean).join(' ');
    return (
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">CSR: {name}</p>
          {agency.csr_email && <p className="text-xs text-gray-500">{agency.csr_email}</p>}
        </div>
      </div>
    );
  }
  if (stepKey === 'setup') {
    return (
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-900">Account setup complete</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      <p className="text-sm font-medium text-gray-900">
        {stepKey === 'roster' ? 'Agent roster' : 'DBA client roster'} uploaded and confirmed
      </p>
    </div>
  );
};

const CsrForm: React.FC<{ agency: CrmAgency; onRefresh: () => Promise<void> }> = ({
  agency,
  onRefresh,
}) => {
  const hasExisting = Boolean(agency.csr_first_name?.trim() || agency.csr_last_name?.trim());
  const [editing, setEditing] = useState(!hasExisting);
  const [firstName, setFirstName] = useState(agency.csr_first_name || '');
  const [lastName, setLastName] = useState(agency.csr_last_name || '');
  const [phone, setPhone] = useState(agency.csr_phone || '');
  const [email, setEmail] = useState(agency.csr_email || '');
  const [npn, setNpn] = useState(agency.csr_npn || '');
  const [gender, setGender] = useState(agency.csr_gender || '');
  const [canFillSeat, setCanFillSeat] = useState(agency.csr_can_fill_seat || false);
  const [saving, setSaving] = useState(false);

  const isValid = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && gender;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await supabase
      .from('crm_agencies')
      .update({
        assigned_csr: fullName,
        csr_first_name: firstName.trim(),
        csr_last_name: lastName.trim(),
        csr_phone: phone.trim(),
        csr_email: email.trim(),
        csr_npn: npn.trim() || null,
        csr_gender: gender || null,
        csr_can_fill_seat: npn.trim() ? canFillSeat : false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency.id);

    await supabase.from('crm_notifications').insert({
      agency_id: agency.id,
      type: 'csr_submitted',
      message: `${agency.name} submitted CSR info: ${fullName} -- action required`,
    });

    setSaving(false);
    setEditing(false);
    await onRefresh();
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm';

  if (!editing && hasExisting) {
    const name = [agency.csr_first_name, agency.csr_last_name].filter(Boolean).join(' ');
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{name}</p>
            {agency.csr_email && <p className="text-xs text-gray-500">{agency.csr_email}</p>}
            {agency.csr_phone && <p className="text-xs text-gray-500">{agency.csr_phone}</p>}
            <p className="text-xs text-amber-600 mt-2">
              Awaiting confirmation from our team
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-navy-600 hover:underline flex-shrink-0"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the CSR (Customer Service Representative) that will be assigned to your agency.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            placeholder="Last name"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="csr@example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NPN <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={npn}
            onChange={(e) => {
              setNpn(e.target.value);
              if (!e.target.value.trim()) setCanFillSeat(false);
            }}
            className={inputClass}
            placeholder="National Producer Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={() => setGender('Male')}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                gender === 'Male'
                  ? 'bg-navy-600 text-white border-navy-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => setGender('Female')}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                gender === 'Female'
                  ? 'bg-navy-600 text-white border-navy-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              Female
            </button>
          </div>
        </div>
      </div>
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
          npn.trim()
            ? 'bg-white border-gray-200'
            : 'bg-gray-50 border-gray-100'
        }`}
      >
        <button
          type="button"
          role="switch"
          aria-checked={canFillSeat}
          disabled={!npn.trim()}
          onClick={() => setCanFillSeat(!canFillSeat)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 ${
            !npn.trim()
              ? 'bg-gray-200 cursor-not-allowed'
              : canFillSeat
                ? 'bg-navy-600 cursor-pointer'
                : 'bg-gray-300 cursor-pointer'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
              canFillSeat ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="flex-1">
          <p className={`text-sm font-medium ${npn.trim() ? 'text-gray-900' : 'text-gray-400'}`}>
            If an agent is terminated, this CSR will temporarily fill that seat
          </p>
          {!npn.trim() && (
            <p className="text-xs text-gray-400 mt-0.5">Requires NPN to enable</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 justify-end pt-2">
        {hasExisting && (
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          className="px-5 py-2.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Submitting...' : 'Submit CSR Info'}
        </button>
      </div>
    </div>
  );
};

const RosterUpload: React.FC<{ agency: CrmAgency; onRefresh: () => Promise<void> }> = ({
  agency,
}) => {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; rowCount: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const sentBackReason = agency.roster_sent_back_reason;

  useEffect(() => {
    const load = async () => {
      const { data: existing } = await supabase
        .from('crm_roster_uploads')
        .select('file_name, row_count')
        .eq('agency', agency.name)
        .order('uploaded_at', { ascending: false })
        .limit(1);
      if (existing && existing.length > 0) {
        setUploadedFile({ name: existing[0].file_name, rowCount: existing[0].row_count });
      }
    };
    load();
  }, [agency.name]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const text = await file.text();
      const { rows: rawRows } = parseCSV(text);
      if (rawRows.length === 0) {
        setError('CSV file appears to be empty or invalid.');
        setUploading(false);
        return;
      }

      const crmNumber = agency.crm_number || '';
      const { headers: canonicalHeaders, rows: normalizedRows } = normalizeRosterRows(rawRows, crmNumber);

      const { data: existing } = await supabase
        .from('crm_roster_uploads')
        .select('id')
        .eq('agency', agency.name);
      if (existing && existing.length > 0) {
        for (const ex of existing) {
          await supabase.from('crm_roster').delete().eq('upload_id', ex.id);
          await supabase.from('crm_roster_uploads').delete().eq('id', ex.id);
        }
      }

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('crm_roster_uploads')
        .insert({ file_name: file.name, row_count: normalizedRows.length, headers: canonicalHeaders, agency: agency.name })
        .select()
        .maybeSingle();

      if (uploadError || !uploadRecord) throw uploadError || new Error('Failed to create upload');

      const BATCH_SIZE = 500;
      for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
        const batch = normalizedRows.slice(i, i + BATCH_SIZE).map((row) => ({
          upload_id: uploadRecord.id,
          row_data: row,
        }));
        await supabase.from('crm_roster').insert(batch);
      }

      await padRosterTo200(uploadRecord.id, canonicalHeaders, {
        calendarEmbedCode: agency.calendar_embed_code,
        agencyUrlPrefix: agency.agency_url_prefix,
      });

      await supabase.from('crm_notifications').insert({
        agency_id: agency.id,
        type: 'roster_uploaded',
        message: `${agency.name} uploaded their agent roster (${normalizedRows.length} rows) -- action required`,
      });

      if (agency.roster_sent_back_reason) {
        await supabase
          .from('crm_agencies')
          .update({ roster_sent_back_reason: null, updated_at: new Date().toISOString() })
          .eq('id', agency.id);
      }

      setUploadedFile({ name: file.name, rowCount: normalizedRows.length });
    } catch {
      setError('Error uploading CSV. Please check the file and try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadRosterTemplate = () => {
    const csvHeader = ROSTER_TEMPLATE_HEADERS.map(escapeField).join(',');
    const blob = new Blob([csvHeader + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agent_roster_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {sentBackReason && !uploadedFile && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Roster Sent Back</p>
            <p className="text-sm text-amber-700 mt-1">{sentBackReason}</p>
            <p className="text-xs text-amber-600 mt-2">Please address the issue above and re-upload your agent roster.</p>
          </div>
        </div>
      )}

      <button
        onClick={downloadRosterTemplate}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download Agent Roster Template
      </button>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Upload Your Roster
          </span>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        {!uploadedFile ? (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-navy-600/40 hover:bg-blue-50/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload agent roster CSV'}
            </p>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">{uploadedFile.rowCount} rows uploaded</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Awaiting confirmation from our team before the next step unlocks.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

const DbaUpload: React.FC<{ agency: CrmAgency; onRefresh: () => Promise<void> }> = ({
  agency,
  onRefresh,
}) => {
  const [templates, setTemplates] = useState<CrmTemplate[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; rowCount: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [savingNoDba, setSavingNoDba] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sentBackReason = agency.dba_sent_back_reason;

  const handleSetNoDba = async (value: boolean) => {
    setSavingNoDba(true);
    await supabase
      .from('crm_agencies')
      .update({ dba_not_applicable: value, updated_at: new Date().toISOString() })
      .eq('id', agency.id);
    await onRefresh();
    setSavingNoDba(false);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('crm_templates').select('*').order('name');
      setTemplates(data || []);

      const { data: existing } = await supabase
        .from('crm_dba_uploads')
        .select('file_name, row_count')
        .eq('agency', agency.name)
        .limit(1);
      if (existing && existing.length > 0) {
        setUploadedFile({ name: existing[0].file_name, rowCount: existing[0].row_count });
      }
    };
    load();
  }, [agency.name]);

  const downloadTemplate = (template: CrmTemplate) => {
    const csvHeader = template.headers.map(escapeField).join(',');
    const blob = new Blob([csvHeader + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.file_name || `${template.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        setError('CSV file appears to be empty or invalid.');
        setUploading(false);
        return;
      }

      await supabase.from('crm_dba_uploads').delete().eq('agency', agency.name);

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('crm_dba_uploads')
        .insert({ agency: agency.name, file_name: file.name, row_count: rows.length, headers })
        .select()
        .maybeSingle();

      if (uploadError || !uploadRecord) throw uploadError || new Error('Failed to create upload');

      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
          upload_id: uploadRecord.id,
          row_data: row,
        }));
        await supabase.from('crm_dba_rows').insert(batch);
      }

      await supabase.from('crm_notifications').insert({
        agency_id: agency.id,
        type: 'dba_uploaded',
        message: `${agency.name} uploaded their DBA client roster (${rows.length} rows) -- action required`,
      });

      if (agency.dba_sent_back_reason) {
        await supabase
          .from('crm_agencies')
          .update({ dba_sent_back_reason: null, updated_at: new Date().toISOString() })
          .eq('id', agency.id);
      }

      setUploadedFile({ name: file.name, rowCount: rows.length });
      await onRefresh();
    } catch {
      setError('Error uploading CSV. Please check the file and try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dbaTemplate = templates.find((t) => t.name.toLowerCase().includes('dba'));

  return (
    <div className="space-y-4">
      {sentBackReason && !uploadedFile && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">DBA Roster Sent Back</p>
            <p className="text-sm text-amber-700 mt-1">{sentBackReason}</p>
            <p className="text-xs text-amber-600 mt-2">Please address the issue above and re-upload your DBA client roster.</p>
          </div>
        </div>
      )}

      {agency.dba_not_applicable ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Shield className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">No DBA — pending CRM approval</p>
              <p className="text-sm text-gray-600 mt-0.5">
                You’ve indicated you don’t have a DBA client roster. Your CRM team will approve to complete your onboarding — no upload needed.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSetNoDba(false)}
            disabled={savingNoDba}
            className="text-sm font-medium text-navy-600 hover:underline disabled:opacity-50"
          >
            Actually, I do have a DBA roster to upload
          </button>
        </div>
      ) : (
      <>
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Shield className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">CRM approval required</p>
          <p className="text-sm text-gray-600 mt-0.5">
            Your CRM team will review and approve your DBA roster before onboarding is marked complete.
          </p>
        </div>
      </div>

      {dbaTemplate && (
        <button
          onClick={() => downloadTemplate(dbaTemplate)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download DBA Client Roster Template
        </button>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Upload Your DBA Roster
          </span>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        {!uploadedFile ? (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-navy-600/40 hover:bg-blue-50/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload DBA client roster CSV'}
            </p>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">{uploadedFile.rowCount} rows uploaded</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Awaiting confirmation from our team. Once confirmed, your full portal will be unlocked.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {!uploadedFile && (
        <button
          onClick={() => handleSetNoDba(true)}
          disabled={savingNoDba}
          className="text-sm font-medium text-gray-500 hover:text-navy-600 hover:underline disabled:opacity-40"
        >
          I don’t have a DBA client roster
        </button>
      )}
      </>
      )}
    </div>
  );
};
