import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, Lock, ExternalLink, CalendarCheck,
  MessageSquare, BookOpen, Video, FileText, Zap, Trophy, AlertCircle
} from 'lucide-react';
import type { AgentPipelineStage } from '../../lib/supabase';
import { WritingNumberUpload } from './WritingNumberUpload';

// ── Contracting stages ──────────────────────────────────────────────────────
const STAGE_CHECKLIST: {
  key: AgentPipelineStage;
  label: string;
  subtitle: string;
}[] = [
  { key: 'hip_broker',      label: 'Intake Form Submitted',       subtitle: 'Your intake form has been received by the contracting team.' },
  { key: 'iaa',             label: 'IAA Sent',                    subtitle: 'Your Independent Agent Agreement is on its way to you.' },
  { key: 'signed_iaa',      label: 'IAA Signed',                  subtitle: 'Sign and return your IAA to the contracting team.' },
  { key: 'bill_com',        label: 'Bill.com Setup',              subtitle: 'Set up your Bill.com account so you can receive commissions.' },
  { key: 'crm',             label: 'CRM Setup',                   subtitle: 'Your CRM tools are being configured.' },
  { key: 'in_contracting',  label: 'In Contracting (Carriers)',   subtitle: 'Your carrier appointments are being processed.' },
  { key: 'rts',             label: 'Ready to Sell',               subtitle: "You're fully appointed and cleared to write business!" },
];

const TYLER_BOOKING_URL = '#'; // Replace with Tyler's Outlook Bookings URL

// ── Types ───────────────────────────────────────────────────────────────────
type HubAgent = {
  agent_id: string;
  agent_slug: string;
  token: string;
  first_name: string | null;
  last_name: string | null;
  agency: string | null;
  stage: AgentPipelineStage | null;
  is_rts: boolean;
};

type WnSubmission = {
  id: string;
  carrier: 'UNL' | 'GTL';
  writing_number: string | null;
  ai_extracted_number: string | null;
  submission_method: 'typed' | 'image';
  status: 'pending' | 'verified' | 'rejected';
  review_note: string | null;
  created_at: string;
};

type TrainingContent = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  has_quiz: boolean;
  quiz_questions: { question: string; options: string[]; correct_index: number }[];
};

type LiveSession = {
  id: string;
  title: string;
  session_datetime: string;
  join_url: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso)) + ' CT';
}

function stageIndex(stage: AgentPipelineStage | null): number {
  if (!stage) return -1;
  return STAGE_CHECKLIST.findIndex(s => s.key === stage);
}

// ── Component ────────────────────────────────────────────────────────────────
export const AgentHub: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [agent, setAgent]               = useState<HubAgent | null>(null);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [training, setTraining]         = useState<TrainingContent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [completedContent, setCompletedContent] = useState<Set<string>>(new Set());
  const [wnSubmissions, setWnSubmissions] = useState<WnSubmission[]>([]);
  const [verifiedCarriers, setVerifiedCarriers] = useState<Set<'UNL' | 'GTL'>>(new Set());
  const [activeQuiz, setActiveQuiz]     = useState<TrainingContent | null>(null);
  const [quizAnswers, setQuizAnswers]   = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore]       = useState<number | null>(null);

  useEffect(() => { if (token) loadHub(); else { setNotFound(true); setLoading(false); } }, [token]);

  const loadHub = async () => {
    const { data: tokenRow } = await supabase
      .from('agent_hub_tokens').select('agent_id, agent_slug, token')
      .eq('token', token!).eq('is_active', true).maybeSingle();
    if (!tokenRow) { setNotFound(true); setLoading(false); return; }

    const [
      { data: agentRow },
      { data: pipelineRow },
      { data: contentRows },
      { data: sessionRows },
      { data: eventRows },
    ] = await Promise.all([
      supabase.from('agents').select('first_name, last_name, agency').eq('id', tokenRow.agent_id).maybeSingle(),
      supabase.from('agent_pipeline').select('stage').eq('agent_id', tokenRow.agent_id).maybeSingle(),
      supabase.from('agent_training_content').select('*').eq('is_active', true).order('display_order'),
      supabase.from('agent_live_sessions').select('*').eq('is_active', true)
        .gte('session_datetime', new Date().toISOString()).order('session_datetime').limit(6),
      supabase.from('agent_training_events').select('content_id, event_type')
        .eq('agent_id', tokenRow.agent_id).in('event_type', ['quiz_pass', 'video_view']),
    ]);

    const stage = (pipelineRow?.stage ?? null) as AgentPipelineStage | null;
    const isRts = ['rts','hip_broker_ready','hip_career_ready','actively_selling'].includes(stage ?? '');

    // Track which content ids have been completed (quiz passed or video viewed)
    const completed = new Set<string>(
      (eventRows ?? []).map(e => e.content_id).filter(Boolean) as string[]
    );

    // Load writing number submissions and verified lob_assignments
    const [{ data: wnSubRows }, { data: lobRows }] = await Promise.all([
      supabase.from('agent_writing_number_submissions')
        .select('id,carrier,writing_number,ai_extracted_number,submission_method,status,review_note,created_at')
        .eq('agent_id', tokenRow.agent_id)
        .order('created_at', { ascending: false }),
      supabase.from('agent_lob_assignments')
        .select('carrier,verified')
        .eq('agent_id', tokenRow.agent_id)
        .eq('verified', true),
    ]);

    const verified = new Set<'UNL' | 'GTL'>(
      (lobRows ?? []).map(r => r.carrier as 'UNL' | 'GTL')
    );

    setAgent({ agent_id: tokenRow.agent_id, agent_slug: tokenRow.agent_slug, token: tokenRow.token,
      first_name: agentRow?.first_name ?? null, last_name: agentRow?.last_name ?? null,
      agency: agentRow?.agency ?? null, stage, is_rts: isRts });
    setTraining(contentRows ?? []);
    setLiveSessions(sessionRows ?? []);
    setCompletedContent(completed);
    setWnSubmissions((wnSubRows ?? []) as WnSubmission[]);
    setVerifiedCarriers(verified);
    setLoading(false);
  };

  const logEvent = async (eventType: string, extras: Record<string, unknown> = {}) => {
    if (!agent) return;
    await supabase.from('agent_training_events').insert({ agent_id: agent.agent_id, event_type: eventType, ...extras });
  };

  const handleTylerClick = () => {
    logEvent('tyler_schedule_click');
    if (TYLER_BOOKING_URL !== '#') window.open(TYLER_BOOKING_URL, '_blank');
  };

  const handleContentClick = (c: TrainingContent) => {
    logEvent('video_view', { content_id: c.id, content_title: c.title });
    setCompletedContent(prev => new Set([...prev, c.id]));
    if (c.content_url) window.open(c.content_url, '_blank');
  };

  const handleLiveClick = (s: LiveSession) => {
    logEvent('live_training_click', { content_id: s.id, content_title: s.title });
    window.open(s.join_url, '_blank');
  };

  const startQuiz = (c: TrainingContent) => {
    setActiveQuiz(c);
    setQuizAnswers(new Array(c.quiz_questions.length).fill(-1));
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    const correct = activeQuiz.quiz_questions.reduce(
      (a, q, i) => a + (quizAnswers[i] === q.correct_index ? 1 : 0), 0
    );
    const score = Math.round((correct / activeQuiz.quiz_questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    await logEvent('quiz_attempt', { content_id: activeQuiz.id, content_title: activeQuiz.title, quiz_score: score, quiz_max_score: 100 });
    if (score >= 80) {
      await logEvent('quiz_pass', { content_id: activeQuiz.id });
      setCompletedContent(prev => new Set([...prev, activeQuiz.id]));
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
    </div>
  );

  if (notFound || !agent) return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hub Not Found</h2>
        <p className="text-gray-500 text-sm">
          This link doesn't exist or has been deactivated.<br />
          Contact <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">Contracting@teamfym.com</a>
        </p>
      </div>
    </div>
  );

  const stageIdx        = stageIndex(agent.stage);
  const completedStages = stageIdx + 1;
  const totalStages     = STAGE_CHECKLIST.length;
  const contractPct     = Math.round((completedStages / totalStages) * 100);

  const completedModules = training.filter(c => completedContent.has(c.id)).length;
  const totalModules     = training.length;
  const trainingPct      = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const firstName = agent.first_name ?? 'Agent';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-navy-800 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-navy-300 text-xs uppercase tracking-widest mb-1">FYM Financial</p>
          <h1 className="text-2xl font-bold">Hey {firstName}! 👋</h1>
          {agent.agency && <p className="text-navy-300 text-sm mt-0.5">{agent.agency}</p>}
        </div>
      </div>

      {/* ── Progress Summary Bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">

          {/* Contracting */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contracting</p>
              <p className="text-xs font-bold text-navy-700">{completedStages}/{totalStages}</p>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-navy-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(contractPct, 4)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {agent.is_rts ? '🎉 Ready to Sell' : `Next: ${STAGE_CHECKLIST[stageIdx + 1]?.label ?? '—'}`}
            </p>
          </div>

          {/* Training */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</p>
              <p className="text-xs font-bold text-navy-700">
                {totalModules > 0 ? `${completedModules}/${totalModules}` : '—'}
              </p>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: totalModules > 0 ? `${Math.max(trainingPct, 4)}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {totalModules === 0
                ? 'Content coming soon'
                : completedModules === totalModules
                  ? '✅ All modules complete'
                  : `${totalModules - completedModules} module${totalModules - completedModules !== 1 ? 's' : ''} remaining`
              }
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── RTS Banner ─────────────────────────────────────────────────────── */}
        {agent.is_rts && (
          <div className="bg-emerald-600 rounded-2xl p-5 text-white flex items-center gap-4">
            <Trophy className="w-10 h-10 text-yellow-300 shrink-0" />
            <div>
              <p className="font-bold text-lg">You're Ready to Sell!</p>
              <p className="text-emerald-100 text-sm">Appointments are active — go write business.</p>
            </div>
          </div>
        )}

        {/* ── Contracting Steps ───────────────────────────────────────────────── */}
        {!agent.is_rts && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Contracting Steps</h2>
              <span className="text-xs text-gray-400">{completedStages} of {totalStages} complete</span>
            </div>

            {/* Stepper */}
            <div className="px-5 py-4">
              {STAGE_CHECKLIST.map((s, i) => {
                const done    = i < stageIdx;
                const current = i === stageIdx;
                const locked  = i > stageIdx;
                const isLast  = i === STAGE_CHECKLIST.length - 1;

                return (
                  <div key={s.key} className="flex gap-4">
                    {/* Line + icon column */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10
                        ${done    ? 'bg-emerald-500 border-emerald-500' : ''}
                        ${current ? 'bg-white border-navy-600' : ''}
                        ${locked  ? 'bg-white border-gray-200' : ''}
                      `}>
                        {done
                          ? <CheckCircle2 className="w-4 h-4 text-white" />
                          : current
                            ? <div className="w-2.5 h-2.5 rounded-full bg-navy-600" />
                            : <Lock className="w-3.5 h-3.5 text-gray-300" />
                        }
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} style={{ minHeight: '20px' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-5 flex-1 ${isLast ? 'pb-1' : ''}`}>
                      <p className={`text-sm font-semibold leading-none mt-1.5
                        ${done ? 'text-emerald-700' : current ? 'text-navy-800' : 'text-gray-400'}
                      `}>
                        {s.label}
                        {done && <span className="ml-2 text-xs font-normal text-emerald-500">✓ Done</span>}
                      </p>
                      {current && (
                        <p className="text-xs text-gray-500 mt-1">{s.subtitle}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Writing Number Upload — only after IAA + Bill.com complete (stageIdx ≥ 3) ── */}
        {!agent.is_rts && stageIdx >= 3 && (
          <WritingNumberUpload
            agentId={agent.agent_id}
            verifiedCarriers={verifiedCarriers}
            existingSubmissions={wnSubmissions}
            onSubmissionAdded={(sub) => {
              setWnSubmissions(prev => [sub, ...prev]);
            }}
          />
        )}

        {/* ── Schedule Test with Tyler ────────────────────────────────────────── */}
        {!agent.is_rts && (() => {
          const hasVerified = verifiedCarriers.size > 0;
          return hasVerified ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-gray-900">Test with Tyler</h2>
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Required for RTS
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Complete your product knowledge check with Tyler before you can be cleared to sell.</p>
                <button
                  onClick={handleTylerClick}
                  className="mt-3 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Book Your Slot
                  {TYLER_BOOKING_URL === '#' && <span className="text-indigo-300">(Coming soon)</span>}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-gray-400">Test with Tyler</h2>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Required for RTS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    Submit your writing number(s) above and wait for contracting to verify before scheduling.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Live Trainings ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Upcoming Live Trainings</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {liveSessions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No upcoming sessions — check back soon.</p>
            ) : liveSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatSessionTime(s.session_datetime)}</p>
                </div>
                <button
                  onClick={() => handleLiveClick(s)}
                  className="shrink-0 inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-semibold border border-navy-200 hover:border-navy-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Join <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Training Library ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Training Library</h2>
            {totalModules > 0 && (
              <span className="text-xs text-gray-400">{completedModules}/{totalModules} complete</span>
            )}
          </div>
          {training.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Training content coming soon.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {training.map(c => {
                const done = completedContent.has(c.id);
                return (
                  <div key={c.id} className={`flex items-start gap-3 px-5 py-4 ${done ? 'bg-emerald-50/40' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : c.content_type === 'video'
                          ? <Video className="w-4 h-4 text-gray-400" />
                          : <FileText className="w-4 h-4 text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${done ? 'text-emerald-700' : 'text-gray-900'}`}>{c.title}</p>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        {c.content_url && (
                          <button
                            onClick={() => handleContentClick(c)}
                            className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-medium"
                          >
                            {c.content_type === 'video' ? 'Watch' : 'Open'} <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {c.has_quiz && c.quiz_questions.length > 0 && (
                          <button
                            onClick={() => startQuiz(c)}
                            className={`inline-flex items-center gap-1 text-xs font-medium ${done ? 'text-emerald-600 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-800'}`}
                          >
                            <BookOpen className="w-3 h-3" />
                            {done ? 'Retake Quiz' : 'Take Quiz'}
                          </button>
                        )}
                      </div>
                    </div>
                    {done && (
                      <span className="shrink-0 text-xs text-emerald-600 font-medium mt-1">Complete</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI Chatbot ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-navy-600" />
            <h2 className="text-sm font-bold text-gray-900">Ask Anything</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Questions about contracting, products, or your next step? Our AI assistant is available 24/7.</p>
          <div className="rounded-xl overflow-hidden border border-gray-100 min-h-[380px]">
            <elevenlabs-convai agent-id={import.meta.env.VITE_ELEVENLABS_AGENT_ID}></elevenlabs-convai>
          </div>
        </div>

      </div>

      {/* ── Quiz Modal ─────────────────────────────────────────────────────────── */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-5">{activeQuiz.title} — Quiz</h3>
            {!quizSubmitted ? (
              <>
                <div className="space-y-5">
                  {activeQuiz.quiz_questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-sm font-semibold text-gray-900 mb-2">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer border transition-colors
                            ${quizAnswers[qi] === oi ? 'border-navy-400 bg-navy-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <input type="radio" name={`q-${qi}`} checked={quizAnswers[qi] === oi}
                              onChange={() => { const u = [...quizAnswers]; u[qi] = oi; setQuizAnswers(u); }}
                              className="accent-navy-600" />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setActiveQuiz(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={submitQuiz} disabled={quizAnswers.includes(-1)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40">
                    Submit
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className={`text-5xl font-extrabold mb-2 ${(quizScore ?? 0) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{quizScore}%</div>
                {(quizScore ?? 0) >= 80
                  ? <p className="text-emerald-700 font-semibold">Passed! Great work.</p>
                  : <p className="text-amber-700 font-semibold">Need 80% to pass — review and try again.</p>
                }
                <button onClick={() => setActiveQuiz(null)} className="mt-5 px-6 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
