import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, Circle, ExternalLink, CalendarCheck,
  MessageSquare, BookOpen, Video, FileText, Star, Zap, Trophy, Lock
} from 'lucide-react';
import type { AgentPipelineStage } from '../../lib/supabase';

// ── Contracting stages ──────────────────────────────────────────────────────
const STAGE_CHECKLIST: {
  key: AgentPipelineStage;
  label: string;
  subtitle: string;
  xp: number;
  emoji: string;
}[] = [
  { key: 'hip_broker',    label: 'Intake Form Submitted',      subtitle: "You're in the system — welcome to FYM!",               xp: 100, emoji: '📋' },
  { key: 'iaa',          label: 'IAA Sent',                   subtitle: 'Your Independent Agent Agreement is on its way.',       xp: 150, emoji: '📨' },
  { key: 'signed_iaa',   label: 'IAA Signed',                 subtitle: 'Sign & return your IAA to lock in your spot.',          xp: 200, emoji: '✍️' },
  { key: 'bill_com',     label: 'Bill.com Setup',             subtitle: 'Get paid — set up your Bill.com account.',              xp: 200, emoji: '💳' },
  { key: 'crm',          label: 'CRM Setup',                  subtitle: 'Your tools are being configured.',                      xp: 200, emoji: '🛠️' },
  { key: 'in_contracting', label: 'In Contracting (Carriers)', subtitle: 'Your carrier appointments are being processed.',       xp: 300, emoji: '⚙️' },
  { key: 'rts',          label: 'Ready to Sell',              subtitle: 'Fully appointed. Time to write business!',              xp: 500, emoji: '🚀' },
];

const TOTAL_XP = STAGE_CHECKLIST.reduce((s, st) => s + st.xp, 0);

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

function earnedXP(idx: number): number {
  return STAGE_CHECKLIST.slice(0, idx + 1).reduce((s, st) => s + st.xp, 0);
}

function rankLabel(xp: number): { label: string; color: string } {
  if (xp >= TOTAL_XP) return { label: '🏆 Elite Agent', color: 'text-amber-500' };
  if (xp >= 900)       return { label: '⭐ Senior Agent', color: 'text-purple-500' };
  if (xp >= 500)       return { label: '🔥 Rising Agent', color: 'text-orange-500' };
  if (xp >= 200)       return { label: '⚡ Active Agent', color: 'text-blue-500' };
  return               { label: '🌱 New Agent', color: 'text-emerald-500' };
}

// ── Component ────────────────────────────────────────────────────────────────
export const AgentHub: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [agent, setAgent]           = useState<HubAgent | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [training, setTraining]     = useState<TrainingContent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<TrainingContent | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore]   = useState<number | null>(null);
  // XP pop animation
  const [xpPop, setXpPop]           = useState(false);

  useEffect(() => { if (token) loadHub(); else { setNotFound(true); setLoading(false); } }, [token]);

  const loadHub = async () => {
    const { data: tokenRow } = await supabase
      .from('agent_hub_tokens').select('agent_id, agent_slug, token')
      .eq('token', token!).eq('is_active', true).maybeSingle();
    if (!tokenRow) { setNotFound(true); setLoading(false); return; }

    const [{ data: agentRow }, { data: pipelineRow }, { data: contentRows }, { data: sessionRows }] = await Promise.all([
      supabase.from('agents').select('first_name, last_name, agency').eq('id', tokenRow.agent_id).maybeSingle(),
      supabase.from('agent_pipeline').select('stage').eq('agent_id', tokenRow.agent_id).maybeSingle(),
      supabase.from('agent_training_content').select('*').eq('is_active', true).order('display_order'),
      supabase.from('agent_live_sessions').select('*').eq('is_active', true)
        .gte('session_datetime', new Date().toISOString()).order('session_datetime').limit(6),
    ]);

    const stage = (pipelineRow?.stage ?? null) as AgentPipelineStage | null;
    const isRts = ['rts','hip_broker_ready','hip_career_ready','actively_selling'].includes(stage ?? '');

    setAgent({ agent_id: tokenRow.agent_id, agent_slug: tokenRow.agent_slug, token: tokenRow.token,
      first_name: agentRow?.first_name ?? null, last_name: agentRow?.last_name ?? null,
      agency: agentRow?.agency ?? null, stage, is_rts: isRts });
    setTraining(contentRows ?? []);
    setLiveSessions(sessionRows ?? []);
    setLoading(false);
  };

  const logEvent = async (eventType: string, extras: Record<string, unknown> = {}) => {
    if (!agent) return;
    await supabase.from('agent_training_events').insert({ agent_id: agent.agent_id, event_type: eventType, ...extras });
  };

  const handleTylerClick = () => { logEvent('tyler_schedule_click'); if (TYLER_BOOKING_URL !== '#') window.open(TYLER_BOOKING_URL, '_blank'); };
  const handleContentClick = (c: TrainingContent) => { logEvent('video_view', { content_id: c.id, content_title: c.title }); if (c.content_url) window.open(c.content_url, '_blank'); };
  const handleLiveClick = (s: LiveSession) => { logEvent('live_training_click', { content_id: s.id, content_title: s.title }); window.open(s.join_url, '_blank'); };

  const startQuiz = (c: TrainingContent) => {
    setActiveQuiz(c); setQuizAnswers(new Array(c.quiz_questions.length).fill(-1));
    setQuizSubmitted(false); setQuizScore(null);
  };
  const submitQuiz = async () => {
    if (!activeQuiz) return;
    const correct = activeQuiz.quiz_questions.reduce((a, q, i) => a + (quizAnswers[i] === q.correct_index ? 1 : 0), 0);
    const score = Math.round((correct / activeQuiz.quiz_questions.length) * 100);
    setQuizScore(score); setQuizSubmitted(true);
    await logEvent('quiz_attempt', { content_id: activeQuiz.id, content_title: activeQuiz.title, quiz_score: score, quiz_max_score: 100 });
    if (score >= 80) { await logEvent('quiz_pass', { content_id: activeQuiz.id }); setXpPop(true); setTimeout(() => setXpPop(false), 1500); }
  };

  // ── Loading / not found ──
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 to-navy-700 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
    </div>
  );
  if (notFound || !agent) return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hub Not Found</h2>
        <p className="text-gray-500 text-sm">This link doesn't exist or has been deactivated.<br />Contact <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">Contracting@teamfym.com</a></p>
      </div>
    </div>
  );

  const stageIdx  = stageIndex(agent.stage);
  const xp        = earnedXP(stageIdx);
  const pct       = Math.round((xp / TOTAL_XP) * 100);
  const rank      = rankLabel(xp);
  const firstName = agent.first_name ?? 'Agent';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-navy-800 via-navy-700 to-indigo-800 text-white pt-10 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-navy-300 text-xs uppercase tracking-widest mb-2">FYM Financial</p>
          <h1 className="text-3xl font-extrabold mb-1">Welcome back, {firstName}! 👋</h1>
          {agent.agency && <p className="text-navy-300 text-sm mb-6">{agent.agency}</p>}

          {/* XP / Rank card */}
          <div className={`bg-white/10 backdrop-blur rounded-2xl px-6 py-5 border border-white/20 transition-transform duration-300 ${xpPop ? 'scale-105' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-left">
                <p className={`text-sm font-bold ${rank.color}`}>{rank.label}</p>
                <p className="text-white/60 text-xs mt-0.5">{xp} / {TOTAL_XP} XP earned</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-white">{pct}%</p>
                <p className="text-white/60 text-xs">to RTS</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-4 bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
              {/* stage tick marks */}
              {STAGE_CHECKLIST.map((_, i) => {
                const tickPct = Math.round(((i + 1) / STAGE_CHECKLIST.length) * 100);
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full w-px bg-white/30"
                    style={{ left: `${tickPct}%` }}
                  />
                );
              })}
            </div>

            {/* Stage dots */}
            <div className="flex justify-between mt-2">
              {STAGE_CHECKLIST.map((s, i) => (
                <div key={s.key} className="flex flex-col items-center" style={{ width: `${100 / STAGE_CHECKLIST.length}%` }}>
                  <div className={`w-2 h-2 rounded-full ${i <= stageIdx ? 'bg-emerald-400' : 'bg-white/30'}`} />
                </div>
              ))}
            </div>

            {/* Next milestone */}
            {!agent.is_rts && stageIdx + 1 < STAGE_CHECKLIST.length && (
              <p className="text-center text-white/70 text-xs mt-3">
                Next: <span className="text-white font-semibold">{STAGE_CHECKLIST[stageIdx + 1].label}</span>
                {' '}→ <span className="text-cyan-300 font-bold">+{STAGE_CHECKLIST[stageIdx + 1].xp} XP</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12 space-y-5">

        {/* ── RTS Banner ── */}
        {agent.is_rts && (
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl p-6 text-center shadow-lg text-white">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-300" />
            <h2 className="text-2xl font-extrabold">You're Ready to Sell! 🎉</h2>
            <p className="text-emerald-100 text-sm mt-1">Max XP unlocked. Appointments are active. Go write business.</p>
          </div>
        )}

        {/* ── Contracting checklist ── */}
        {!agent.is_rts && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Contracting Progress</h2>
                <p className="text-xs text-gray-400 mt-0.5">Complete each step to unlock your next stage</p>
              </div>
              <span className="text-xs font-bold text-navy-600 bg-navy-50 px-2.5 py-1 rounded-full">
                {stageIdx + 1}/{STAGE_CHECKLIST.length}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {STAGE_CHECKLIST.map((s, i) => {
                const done    = i <= stageIdx;
                const current = i === stageIdx;
                const locked  = i > stageIdx;

                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors
                      ${current ? 'bg-gradient-to-r from-navy-50 to-indigo-50' : ''}
                      ${done && !current ? 'bg-emerald-50/40' : ''}
                    `}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base
                      ${done    ? 'bg-emerald-100' : ''}
                      ${current ? 'bg-navy-100 ring-2 ring-navy-400 ring-offset-1' : ''}
                      ${locked  ? 'bg-gray-100' : ''}
                    `}>
                      {done && !current
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : locked
                          ? <Lock className="w-4 h-4 text-gray-300" />
                          : <span>{s.emoji}</span>
                      }
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${locked ? 'text-gray-400' : 'text-gray-900'}`}>
                        {s.label}
                      </p>
                      {(current || done) && (
                        <p className={`text-xs mt-0.5 ${done && !current ? 'text-emerald-600' : 'text-navy-500'}`}>
                          {done && !current ? '✓ Complete' : s.subtitle}
                        </p>
                      )}
                    </div>

                    {/* XP badge */}
                    <div className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full
                      ${done    ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${current ? 'bg-amber-100 text-amber-700' : ''}
                      ${locked  ? 'bg-gray-100 text-gray-400' : ''}
                    `}>
                      <Star className="w-3 h-3" />
                      {done ? '+' : ''}{s.xp} XP
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Schedule Test with Tyler ── */}
        {!agent.is_rts && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                <CalendarCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900">Test with Tyler</h2>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Required for RTS
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Pass your product knowledge check and unlock your last 500 XP.</p>
                <button
                  onClick={handleTylerClick}
                  className="mt-3 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Book Your Slot
                  {TYLER_BOOKING_URL === '#' && <span className="text-indigo-300 text-xs">(Coming soon)</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Live Training Sessions ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-navy-600" />
            <h2 className="text-base font-bold text-gray-900">Live Trainings</h2>
            <span className="ml-auto text-xs text-gray-400">Join to earn XP</span>
          </div>
          <div className="divide-y divide-gray-50">
            {liveSessions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No upcoming sessions right now — check back soon.</p>
            ) : liveSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatSessionTime(s.session_datetime)}</p>
                </div>
                <button
                  onClick={() => handleLiveClick(s)}
                  className="shrink-0 inline-flex items-center gap-1 bg-navy-700 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Join <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Training Library ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-navy-600" />
            <h2 className="text-base font-bold text-gray-900">Training Library</h2>
            <span className="ml-auto text-xs text-gray-400">Earn XP per module</span>
          </div>
          {training.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Training content coming soon.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {training.map(c => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-navy-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      {c.content_type === 'video' ? <Video className="w-4 h-4 text-navy-500" /> : <FileText className="w-4 h-4 text-navy-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {c.content_url && (
                          <button onClick={() => handleContentClick(c)} className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-medium">
                            Open <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {c.has_quiz && c.quiz_questions.length > 0 && (
                          <button onClick={() => startQuiz(c)} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 text-xs font-medium">
                            <Star className="w-3 h-3" /> Take Quiz
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> +50 XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AI Chatbot ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-navy-600" />
            <h2 className="text-base font-bold text-gray-900">Ask Anything</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Questions about contracting, products, or your next step? Ask our AI assistant — available 24/7.</p>
          <div className="rounded-xl overflow-hidden border border-gray-100 min-h-[380px]">
            <elevenlabs-convai agent-id={import.meta.env.VITE_ELEVENLABS_AGENT_ID}></elevenlabs-convai>
          </div>
        </div>

      </div>

      {/* ── Quiz Modal ── */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-gray-900">{activeQuiz.title}</h3>
            </div>
            {!quizSubmitted ? (
              <>
                <div className="space-y-5">
                  {activeQuiz.quiz_questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-sm font-semibold text-gray-900 mb-2">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer border transition-colors ${quizAnswers[qi] === oi ? 'border-navy-400 bg-navy-50' : 'border-gray-200 hover:bg-gray-50'}`}>
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
                  ? <><p className="text-emerald-700 font-semibold">Passed! 🎉 +50 XP earned</p><p className="text-sm text-gray-500 mt-1">Keep it up.</p></>
                  : <><p className="text-amber-700 font-semibold">Not quite — 80% to pass.</p><p className="text-sm text-gray-500 mt-1">Review the material and try again.</p></>
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
