import React, { useState } from 'react';
import { Upload, PenLine, CheckCircle2, Clock, AlertCircle, ChevronDown, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CARRIERS = ['UNL', 'GTL'] as const;
type Carrier = typeof CARRIERS[number];

type Submission = {
  id: string;
  carrier: Carrier;
  writing_number: string | null;
  ai_extracted_number: string | null;
  submission_method: 'typed' | 'image';
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: string;
};

interface WritingNumberUploadProps {
  agentId: string;
  /** Existing verified lob_assignments — to show already-verified carriers */
  verifiedCarriers: Set<Carrier>;
  /** Pending/rejected submissions already in the DB — to show status without reload */
  existingSubmissions: Submission[];
  onSubmissionAdded: (sub: Submission) => void;
}

type Mode = 'typed' | 'image';

export const WritingNumberUpload: React.FC<WritingNumberUploadProps> = ({
  agentId,
  verifiedCarriers,
  existingSubmissions,
  onSubmissionAdded,
}) => {
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | ''>('');
  const [mode, setMode] = useState<Mode>('typed');
  const [typedNumber, setTypedNumber] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedNumber, setExtractedNumber] = useState<string | null>(null);
  const [confirmedNumber, setConfirmedNumber] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Determine which carriers still need a submission
  const carriersNeedingAction = CARRIERS.filter(c => !verifiedCarriers.has(c));
  const pendingByCarrier = new Map<Carrier, Submission>();
  existingSubmissions.forEach(s => {
    if (!pendingByCarrier.has(s.carrier as Carrier) || s.status === 'pending') {
      pendingByCarrier.set(s.carrier as Carrier, s);
    }
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setExtractedNumber(null);
    setConfirmedNumber('');
    setExtractError('');

    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!imageFile || !imagePreview) return;
    setExtracting(true);
    setExtractError('');
    try {
      // Call Anthropic vision via a Supabase edge function to extract writing number from image
      const { data, error } = await supabase.functions.invoke('extract-writing-number', {
        body: { image_base64: imagePreview.split(',')[1], carrier: selectedCarrier },
      });
      if (error || !data?.writing_number) {
        setExtractError("Couldn't read the writing number automatically. Please type it in below.");
        setConfirmedNumber('');
      } else {
        setExtractedNumber(data.writing_number);
        setConfirmedNumber(data.writing_number);
      }
    } catch {
      setExtractError("Extraction failed. Please type in your writing number.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCarrier) return setError('Select a carrier.');
    const finalNumber = mode === 'typed' ? typedNumber.trim() : confirmedNumber.trim();
    if (!finalNumber) return setError('Writing number is required.');

    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        agent_id: agentId,
        carrier: selectedCarrier,
        submission_method: mode,
        status: 'pending',
        ...(mode === 'typed'
          ? { writing_number: finalNumber }
          : {
              writing_number: finalNumber,
              ai_extracted_number: extractedNumber,
              source_image_url: null, // image stored in browser only; no storage bucket yet
            }),
      };

      const { data, error: insertErr } = await supabase
        .from('agent_writing_number_submissions')
        .insert(payload)
        .select()
        .maybeSingle();

      if (insertErr) throw insertErr;

      // Also flag the agent_pipeline card for contracting review
      await supabase
        .from('agent_pipeline')
        .update({ wn_pending_review: true, wn_pending_count: supabase.rpc as unknown as number })
        .eq('agent_id', agentId);

      // Simpler pipeline flag update — increment via a single update
      const { data: pipe } = await supabase
        .from('agent_pipeline')
        .select('wn_pending_count')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (pipe !== null) {
        await supabase
          .from('agent_pipeline')
          .update({
            wn_pending_review: true,
            wn_pending_count: (pipe?.wn_pending_count ?? 0) + 1,
          })
          .eq('agent_id', agentId);
      }

      if (data) onSubmissionAdded(data as Submission);

      // Reset form
      setSelectedCarrier('');
      setTypedNumber('');
      setImageFile(null);
      setImagePreview(null);
      setExtractedNumber(null);
      setConfirmedNumber('');
      setShowForm(false);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelectedCarrier('');
    setTypedNumber('');
    setImageFile(null);
    setImagePreview(null);
    setExtractedNumber(null);
    setConfirmedNumber('');
    setExtractError('');
    setError('');
    setMode('typed');
  };

  // All carriers verified — show complete state
  const allVerified = CARRIERS.every(c => verifiedCarriers.has(c));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${allVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <PenLine className={`w-4 h-4 ${allVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Writing Numbers</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {allVerified ? 'All verified ✓' : 'Required before Test with Tyler'}
            </p>
          </div>
        </div>
        {!allVerified && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-navy-600 hover:text-navy-800 border border-navy-200 hover:border-navy-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Submit
          </button>
        )}
      </div>

      {/* Carrier status rows */}
      <div className="divide-y divide-gray-50">
        {CARRIERS.map(carrier => {
          const verified = verifiedCarriers.has(carrier);
          const submission = pendingByCarrier.get(carrier);
          return (
            <div key={carrier} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{carrier}</p>
                {submission?.status === 'rejected' && submission.review_note && (
                  <p className="text-xs text-red-500 mt-0.5">Rejected: {submission.review_note}</p>
                )}
              </div>
              {verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : submission?.status === 'pending' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Pending review
                </span>
              ) : submission?.status === 'rejected' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Resubmit
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not submitted</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Submission form */}
      {showForm && !allVerified && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Submit Writing Number</p>
            <button onClick={() => { setShowForm(false); reset(); }} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Carrier select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Carrier <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedCarrier}
                onChange={e => { setSelectedCarrier(e.target.value as Carrier | ''); setError(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              >
                <option value="">Select carrier…</option>
                {carriersNeedingAction.map(c => {
                  const sub = pendingByCarrier.get(c);
                  const hasPending = sub?.status === 'pending';
                  return (
                    <option key={c} value={c} disabled={hasPending}>
                      {c}{hasPending ? ' (pending review)' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Method toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">How are you submitting?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('typed'); setImageFile(null); setImagePreview(null); setExtractedNumber(null); setConfirmedNumber(''); setExtractError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${mode === 'typed' ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <PenLine className="w-3.5 h-3.5" /> Type it in
              </button>
              <button
                type="button"
                onClick={() => { setMode('image'); setTypedNumber(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${mode === 'image' ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload image
              </button>
            </div>
          </div>

          {/* Typed mode */}
          {mode === 'typed' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Writing Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={typedNumber}
                onChange={e => { setTypedNumber(e.target.value); setError(''); }}
                placeholder={selectedCarrier ? `Your ${selectedCarrier} writing number` : 'Select a carrier first'}
                disabled={!selectedCarrier}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          )}

          {/* Image mode */}
          {mode === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload your appointment letter or writing number document
                </label>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition-colors ${imageFile ? 'border-navy-300 bg-navy-50' : 'border-gray-200 hover:border-navy-300 hover:bg-gray-50'}`}>
                  <Upload className={`w-5 h-5 ${imageFile ? 'text-navy-500' : 'text-gray-300'}`} />
                  <span className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Tap to choose a photo or PDF'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleImageChange} className="hidden" />
                </label>
              </div>

              {imagePreview && (
                <div className="space-y-2">
                  {imagePreview.startsWith('data:image') && (
                    <img src={imagePreview} alt="Preview" className="rounded-lg max-h-40 object-contain border border-gray-100" />
                  )}
                  {!extractedNumber && !extracting && (
                    <button
                      onClick={handleExtract}
                      disabled={extracting || !selectedCarrier}
                      className="w-full py-2 rounded-lg bg-navy-600 text-white text-xs font-semibold hover:bg-navy-700 disabled:opacity-40 transition-colors"
                    >
                      Extract Writing Number with AI
                    </button>
                  )}
                  {extracting && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading document…
                    </div>
                  )}
                  {extractError && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{extractError}</p>
                  )}
                  {(extractedNumber !== null || extractError) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {extractedNumber ? 'AI found this number — confirm or correct it:' : 'Enter your writing number:'}
                      </label>
                      <input
                        type="text"
                        value={confirmedNumber}
                        onChange={e => setConfirmedNumber(e.target.value)}
                        placeholder="Writing number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedCarrier || (mode === 'typed' ? !typedNumber.trim() : !confirmedNumber.trim())}
              className="flex-1 py-2.5 rounded-xl bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</> : 'Submit for Review'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            The contracting team will verify your number — usually within 1 business day.
          </p>
        </div>
      )}
    </div>
  );
};
