import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Users,
  FileText,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';
import { supabase, US_STATES } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';

type Step = 'verify' | 'client' | 'policy' | 'review';

const STEPS: { key: Step; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'verify', label: 'Agent Verification', icon: UserCheck },
  { key: 'client', label: 'Client Info', icon: Users },
  { key: 'policy', label: 'Policy Details', icon: FileText },
  { key: 'review', label: 'Review & Submit', icon: ClipboardCheck },
];

const CARRIERS = ['UNL', 'GTL'];
const PRODUCTS = ['Hospital Indemnity', 'Home Health Care'];
const BILLING_MODES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

interface RosterMatch {
  rowId: string;
  firstName: string;
  lastName: string;
  npn: string;
}

export const BusinessIntakeForm: React.FC<{ slug: string }> = ({ slug }) => {
  const [agency, setAgency] = useState<CrmAgency | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<Step>('verify');
  const [submitted, setSubmitted] = useState(false);

  // Agent verification
  const [agentFirst, setAgentFirst] = useState('');
  const [agentLast, setAgentLast] = useState('');
  const [agentNpn, setAgentNpn] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [rosterMatch, setRosterMatch] = useState<RosterMatch | null>(null);

  // Client info
  const [clientFirst, setClientFirst] = useState('');
  const [clientLast, setClientLast] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientState, setClientState] = useState('');

  // Policy details
  const [carrier, setCarrier] = useState('');
  const [productType, setProductType] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [billingMode, setBillingMode] = useState('');
  const [notes, setNotes] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const loadAgency = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      const { data } = await supabase
        .from('hierarchy_agencies')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (!data) { setNotFound(true); } else { setAgency(data); }
      setLoading(false);
    };
    loadAgency();
  }, [slug]);

  const handleVerify = async () => {
    if (!agency) return;
    setVerifying(true);
    setVerifyError('');

    try {
      // Get the latest roster upload for this agency
      const { data: uploads } = await supabase
        .from('crm_roster_uploads')
        .select('id, agency')
        .eq('agency', agency.name)
        .order('uploaded_at', { ascending: false })
        .limit(1);

      if (!uploads || uploads.length === 0) {
        setVerifyError('No roster found for this agency. Please contact your agency administrator.');
        setVerifying(false);
        return;
      }

      const uploadId = uploads[0].id;

      // Query roster rows for this upload
      const { data: rows } = await supabase
        .from('crm_roster')
        .select('id, row_data')
        .eq('upload_id', uploadId);

      if (!rows || rows.length === 0) {
        setVerifyError('Agency roster is empty. Please contact your agency administrator.');
        setVerifying(false);
        return;
      }

      // Match by first name + last name + NPN (case-insensitive)
      const match = rows.find(row => {
        const rd = row.row_data || {};
        const fn = (rd['First Name'] || '').trim().toLowerCase();
        const ln = (rd['Last Name'] || '').trim().toLowerCase();
        const npn = (rd['Agent NPN'] || '').trim();
        return (
          fn === agentFirst.trim().toLowerCase() &&
          ln === agentLast.trim().toLowerCase() &&
          npn === agentNpn.trim()
        );
      });

      if (!match) {
        setVerifyError(
          'Agent not found in the agency roster. Please verify your name and NPN match exactly, or contact your agency administrator.'
        );
        setVerifying(false);
        return;
      }

      setRosterMatch({
        rowId: match.id,
        firstName: agentFirst.trim(),
        lastName: agentLast.trim(),
        npn: agentNpn.trim(),
      });
      setVerified(true);
    } catch {
      setVerifyError('An error occurred during verification. Please try again.');
    }
    setVerifying(false);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'verify': return verified;
      case 'client': return !!(clientFirst && clientLast);
      case 'policy': return !!(carrier && productType);
      case 'review': return true;
      default: return false;
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1 && canProceed()) {
      setStep(STEPS[stepIndex + 1].key);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!agency || !rosterMatch) return;
    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('crm_business_intake').insert({
      agency_id: agency.id,
      agency_name: agency.name,
      agent_first_name: rosterMatch.firstName,
      agent_last_name: rosterMatch.lastName,
      agent_npn: rosterMatch.npn,
      roster_row_id: rosterMatch.rowId,
      client_first_name: clientFirst.trim(),
      client_last_name: clientLast.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      client_state: clientState || null,
      carrier,
      product_type: productType,
      policy_number: policyNumber.trim() || null,
      premium_amount: premiumAmount ? parseFloat(premiumAmount) : null,
      effective_date: effectiveDate || null,
      billing_mode: billingMode || null,
      notes: notes.trim() || null,
      status: 'pending',
    });

    if (error) {
      setSubmitError('Failed to submit. Please try again or contact your administrator.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-400" />
      </div>
    );
  }

  if (notFound || !agency) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-steel-200 p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2">Form Not Found</h2>
          <p className="text-steel-500 text-sm mb-6">
            The intake form you're looking for doesn't exist or this agency is no longer active.
          </p>
          <p className="text-xs text-steel-400">
            Contact your agency administrator or email Contracting@teamFYM.com
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-steel-200 p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2">Submission Received!</h2>
          <p className="text-steel-500 text-sm mb-4">
            Your new business intake has been submitted successfully for {agency.name}.
          </p>
          <p className="text-steel-400 text-xs mb-6">
            Client: {clientFirst} {clientLast} · {carrier} {productType}
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setStep('verify');
              setVerified(false);
              setRosterMatch(null);
              setAgentFirst('');
              setAgentLast('');
              setAgentNpn('');
              setClientFirst('');
              setClientLast('');
              setClientPhone('');
              setClientEmail('');
              setClientState('');
              setCarrier('');
              setProductType('');
              setPolicyNumber('');
              setPremiumAmount('');
              setEffectiveDate('');
              setBillingMode('');
              setNotes('');
            }}
            className="px-6 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-steel-700 mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100">
      {/* Header */}
      <header className="bg-navy-900 border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            {agency.business_logo_url ? (
              <img src={agency.business_logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-navy-600" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center border border-navy-600">
                <Building2 className="w-5 h-5 text-gold-400" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">{agency.business_name || agency.name}</h1>
              <p className="text-xs text-gold-400">New Business Intake Form</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = s.key === step;
            const isDone = i < stepIndex;
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCurrent ? 'bg-navy-600 text-white' :
                    isDone ? 'bg-emerald-500 text-white' :
                    'bg-steel-200 text-steel-500'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent ? 'text-navy-700' : isDone ? 'text-emerald-600' : 'text-steel-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-20px] ${isDone ? 'bg-emerald-400' : 'bg-steel-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-lg border border-steel-200 p-6 sm:p-8">

          {/* Step 1: Agent Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-steel-900">Agent Verification</h2>
                <p className="text-sm text-steel-500 mt-1">
                  Enter your details exactly as they appear in your agency's roster.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input
                    type="text"
                    value={agentFirst}
                    onChange={(e) => { setAgentFirst(e.target.value); setVerified(false); setVerifyError(''); }}
                    placeholder="John"
                    disabled={verified}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input
                    type="text"
                    value={agentLast}
                    onChange={(e) => { setAgentLast(e.target.value); setVerified(false); setVerifyError(''); }}
                    placeholder="Doe"
                    disabled={verified}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>NPN (National Producer Number) *</label>
                <input
                  type="text"
                  value={agentNpn}
                  onChange={(e) => { setAgentNpn(e.target.value); setVerified(false); setVerifyError(''); }}
                  placeholder="12345678"
                  disabled={verified}
                  className={inputCls}
                />
              </div>

              {verifyError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{verifyError}</p>
                </div>
              )}

              {verified && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Verified!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {rosterMatch?.firstName} {rosterMatch?.lastName} — NPN {rosterMatch?.npn}
                    </p>
                  </div>
                </div>
              )}

              {!verified && (
                <button
                  onClick={handleVerify}
                  disabled={!agentFirst || !agentLast || !agentNpn || verifying}
                  className="flex items-center gap-2 px-6 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold disabled:opacity-40"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Verify Agent
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Client Info */}
          {step === 'client' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-steel-900">Client Information</h2>
                <p className="text-sm text-steel-500 mt-1">Enter the policyholder's details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input type="text" value={clientFirst} onChange={(e) => setClientFirst(e.target.value)} placeholder="Jane" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input type="text" value={clientLast} onChange={(e) => setClientLast(e.target.value)} placeholder="Smith" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(555) 123-4567" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="jane@email.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>State</label>
                <select value={clientState} onChange={(e) => setClientState(e.target.value)} className={inputCls}>
                  <option value="">Select state...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Policy Details */}
          {step === 'policy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-steel-900">Policy Details</h2>
                <p className="text-sm text-steel-500 mt-1">Enter the policy information for this submission.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Carrier *</label>
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls}>
                    <option value="">Select carrier...</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Product Type *</label>
                  <select value={productType} onChange={(e) => setProductType(e.target.value)} className={inputCls}>
                    <option value="">Select product...</option>
                    {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Policy Number</label>
                  <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="POL-12345" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Premium Amount ($)</label>
                  <input type="number" step="0.01" min="0" value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Effective Date</label>
                  <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Billing Mode</label>
                  <select value={billingMode} onChange={(e) => setBillingMode(e.target.value)} className={inputCls}>
                    <option value="">Select billing mode...</option>
                    {BILLING_MODES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..." className={inputCls} />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-steel-900">Review & Submit</h2>
                <p className="text-sm text-steel-500 mt-1">Please review the information below before submitting.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-semibold text-steel-500 uppercase tracking-wide mb-3">Agent</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-steel-500">Name:</span> <span className="font-medium text-steel-900">{rosterMatch?.firstName} {rosterMatch?.lastName}</span></div>
                    <div><span className="text-steel-500">NPN:</span> <span className="font-medium text-steel-900">{rosterMatch?.npn}</span></div>
                  </div>
                </div>

                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-semibold text-steel-500 uppercase tracking-wide mb-3">Client</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-steel-500">Name:</span> <span className="font-medium text-steel-900">{clientFirst} {clientLast}</span></div>
                    {clientPhone && <div><span className="text-steel-500">Phone:</span> <span className="font-medium text-steel-900">{clientPhone}</span></div>}
                    {clientEmail && <div><span className="text-steel-500">Email:</span> <span className="font-medium text-steel-900">{clientEmail}</span></div>}
                    {clientState && <div><span className="text-steel-500">State:</span> <span className="font-medium text-steel-900">{clientState}</span></div>}
                  </div>
                </div>

                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-semibold text-steel-500 uppercase tracking-wide mb-3">Policy</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-steel-500">Carrier:</span> <span className="font-medium text-steel-900">{carrier}</span></div>
                    <div><span className="text-steel-500">Product:</span> <span className="font-medium text-steel-900">{productType}</span></div>
                    {policyNumber && <div><span className="text-steel-500">Policy #:</span> <span className="font-medium text-steel-900">{policyNumber}</span></div>}
                    {premiumAmount && <div><span className="text-steel-500">Premium:</span> <span className="font-medium text-steel-900">${parseFloat(premiumAmount).toFixed(2)}</span></div>}
                    {effectiveDate && <div><span className="text-steel-500">Effective:</span> <span className="font-medium text-steel-900">{effectiveDate}</span></div>}
                    {billingMode && <div><span className="text-steel-500">Billing:</span> <span className="font-medium text-steel-900">{billingMode}</span></div>}
                  </div>
                  {notes && (
                    <div className="mt-3 pt-3 border-t border-steel-200">
                      <span className="text-steel-500 text-sm">Notes:</span>
                      <p className="text-sm text-steel-700 mt-1">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-steel-200">
            {stepIndex > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-steel-600 hover:text-steel-900 hover:bg-steel-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit New Business
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold disabled:opacity-40"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-steel-400 text-center mt-6">
          Powered by FYM Financial CRM · {agency.name}
        </p>
      </div>
    </div>
  );
};
