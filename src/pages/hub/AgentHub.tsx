import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Circle, Clock, ExternalLink, CalendarCheck, MessageSquare, Upload, BookOpen, Video, FileText } from 'lucide-react';
import type { AgentPipelineStage } from '../../lib/supabase';

const STAGE_CHECKLIST: { key: AgentPipelineStage; label: string; description: string }[] = [
  { key: 'hip_broker', label: 'Intake Form Submitted', description: 'Your intake form has been received.' },
  { key: 'iaa', label: 'IAA Sent', description: 'Your Independent Agent Agreement is on its way.' },
  { key: 'signed_iaa', label: 'IAA Signed', description: 'Sign and return your IAA to the contracting team.' },
  { key: 'bill_com', label: 'Bill.com Setup', description: 'Set up your Bill.com account for commission payments.' },
  { key: 'crm', label: 'CRM Setup', description: 'Your CRM access is being configured.' },
  { key: 'in_contracting', label: 'In Contracting (Carriers)', description: 'Your carrier appointments are being processed.' },
  { key: 'rts', label: 'Ready to Sell', description: "You're appointed and cleared to write business!" },
];

const TYLER_BOOKING_URL = '#'; // Placeholder — replace with Tyler's Outlook Bookings URL

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

export const AgentHub: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [agent, setAgent] = useState<HubAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [training, setTraining] = useState<TrainingContent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<TrainingContent | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    loadHub();
  }, [token]);

  const loadHub = async () => {
    // Look up token → agent
    const { data: tokenRow } = await supabase
      .from('agent_hub_tokens')
      .select('agent_id, agent_slug, token')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (!tokenRow) { setNotFound(true); setLoading(false); return; }

    // Get agent info + pipeline stage
    const { data: agentRow } = await supabase
      .from('agents')
      .select('first_name, last_name, agency')
      .eq('id', tokenRow.agent_id)
      .maybeSingle();

    const { data: pipelineRow } = await supabase
      .from('agent_pipeline')
      .select('stage')
      .eq('agent_id', tokenRow.agent_id)
      .maybeSingle();

    const stage = (pipelineRow?.stage ?? null) as AgentPipelineStage | null;
    const isRts = stage === 'rts' || stage === 'hip_broker_ready' || stage === 'hip_career_ready' || stage === 'actively_selling';

    setAgent({
      agent_id: tokenRow.agent_id,
      agent_slug: tokenRow.agent_slug,
      token: tokenRow.token,
      first_name: agentRow?.first_name ?? null,
      last_name: agentRow?.last_name ?? null,
      agency: agentRow?.agency ?? null,
      stage,
      is_rts: isRts,
    });

    // Load training content
    const { data: contentRows } = await supabase
      .from('agent_training_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setTraining(contentRows ?? []);

    // Load upcoming live sessions
    const { data: sessionRows } = await supabase
      .from('agent_live_sessions')
      .select('*')
      .eq('is_active', true)
      .gte('session_datetime', new Date().toISOString())
      .order('session_datetime', { ascending: true })
      .limit(5);
    setLiveSessions(sessionRows ?? []);

    setLoading(false);
  };

  const logEvent = async (eventType: string, extras: Record<string, unknown> = {}) => {
    if (!agent) return;
    await supabase.from('agent_training_events').insert({
      agent_id: agent.agent_id,
      event_type: eventType,
      ...extras,
    });
  };

  const currentStageIndex = (stage: AgentPipelineStage | null) => {
    if (!stage) return -1;
    return STAGE_CHECKLIST.findIndex(s => s.key === stage);
  };

  const handleTylerClick = () => {
    logEvent('tyler_schedule_click');
    if (TYLER_BOOKING_URL !== '#') window.open(TYLER_BOOKING_URL, '_blank');
  };

  const handleContentClick = (content: TrainingContent) => {
    logEvent('video_view', { content_id: content.id, content_title: content.title });
    if (content.content_url) window.open(content.content_url, '_blank');
  };

  const handleLiveSessionClick = (session: LiveSession) => {
    logEvent('live_training_click', { content_id: session.id, content_title: session.title });
    window.open(session.join_url, '_blank');
  };

  const startQuiz = (content: TrainingContent) => {
    setActiveQuiz(content);
    setQuizAnswers(new Array(content.quiz_questions.length).fill(-1));
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    const correct = activeQuiz.quiz_questions.reduce((acc, q, i) => acc + (quizAnswers[i] === q.correct_index ? 1 : 0), 0);
    const score = Math.round((correct / activeQuiz.quiz_questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    await logEvent('quiz_attempt', {
      content_id: activeQuiz.id,
      content_title: activeQuiz.title,
      quiz_score: score,
      quiz_max_score: 100,
    });
    if (score >= 80) await logEvent('quiz_pass', { content_id: activeQuiz.id, content_title: activeQuiz.title });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-steel-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hub Not Found</h2>
          <p className="text-gray-500 text-sm">This link doesn't exist or has been deactivated. Contact <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">Contracting@teamfym.com</a></p>
        </div>
      </div>
    );
  }

  const stageIdx = currentStageIndex(agent.stage);
  const firstName = agent.first_name ?? 'Agent';

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 to-steel-50">
      {/* Header */}
      <div className="bg-navy-700 text-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-navy-200 text-sm mb-1">FYM Financial</p>
          <h1 className="text-2xl font-bold">Welcome, {firstName}!</h1>
          {agent.agency && <p className="text-navy-200 mt-1 text-sm">{agent.agency}</p>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Contracting Progress (hidden once RTS+) ── */}
        {!agent.is_rts && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-navy-600" /> Contracting Progress
            </h2>
            <ol className="space-y-3">
              {STAGE_CHECKLIST.map((s, idx) => {
                const done = idx <= stageIdx;
                const current = idx === stageIdx;
                return (
                  <li key={s.key} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${current ? 'bg-navy-50 border border-navy-200' : ''}`}>
                    <div className="mt-0.5">
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-gray-300" />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                      {current && <p className="text-xs text-navy-600 mt-0.5">{s.description}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ── RTS Banner ── */}
        {agent.is_rts && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-emerald-800">You're Ready to Sell! 🎉</h2>
            <p className="text-emerald-700 text-sm mt-1">Your appointments are active. Start writing business.</p>
          </section>
        )}

        {/* ── Schedule Test with Tyler ── */}
        {!agent.is_rts && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-navy-600" /> Schedule Your Test with Tyler
            </h2>
            <p className="text-sm text-gray-500 mb-4">Before you can be marked Ready to Sell, you'll complete a product knowledge check with Tyler.</p>
            <button
              onClick={handleTylerClick}
              className="inline-flex items-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <CalendarCheck className="w-4 h-4" /> Book Your Test with Tyler
              {TYLER_BOOKING_URL === '#' && <span className="text-navy-300 text-xs ml-1">(Coming soon)</span>}
            </button>
          </section>
        )}

        {/* ── Live Training Sessions ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-navy-600" /> Upcoming Live Trainings
          </h2>
          {liveSessions.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming sessions scheduled. Check back soon.</p>
          ) : (
            <ul className="space-y-3">
              {liveSessions.map(session => (
                <li key={session.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{session.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Chicago',
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      }).format(new Date(session.session_datetime))} CT
                    </p>
                  </div>
                  <button
                    onClick={() => handleLiveSessionClick(session)}
                    className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-sm font-medium"
                  >
                    Join <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Training Library ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-navy-600" /> Training Library
          </h2>
          {training.length === 0 ? (
            <p className="text-sm text-gray-400">Training content will be available here soon.</p>
          ) : (
            <div className="space-y-4">
              {training.map(content => (
                <div key={content.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {content.content_type === 'video'
                        ? <Video className="w-5 h-5 text-navy-400 mt-0.5 shrink-0" />
                        : <FileText className="w-5 h-5 text-navy-400 mt-0.5 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{content.title}</p>
                        {content.description && <p className="text-xs text-gray-500 mt-0.5">{content.description}</p>}
                      </div>
                    </div>
                    {content.content_url && (
                      <button
                        onClick={() => handleContentClick(content)}
                        className="shrink-0 inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-sm font-medium"
                      >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {content.has_quiz && content.quiz_questions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => startQuiz(content)}
                        className="text-xs font-medium text-navy-600 hover:text-navy-800"
                      >
                        Take Quiz →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Chatbot (ElevenLabs) ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-navy-600" /> Ask a Question
          </h2>
          <p className="text-sm text-gray-500 mb-4">Have questions about contracting, products, or your next step? Ask our AI assistant.</p>
          <div id="elevenlabs-chatbot-widget" className="w-full min-h-[400px] rounded-xl overflow-hidden border border-gray-100">
            {/* ElevenLabs widget mounts here — configured via VITE_ELEVENLABS_AGENT_ID */}
            <elevenlabs-convai agent-id={import.meta.env.VITE_ELEVENLABS_AGENT_ID}></elevenlabs-convai>
          </div>
        </section>

      </div>

      {/* Quiz Modal */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{activeQuiz.title} — Quiz</h3>
            {!quizSubmitted ? (
              <>
                <div className="space-y-5">
                  {activeQuiz.quiz_questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-sm font-semibold text-gray-900 mb-2">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer border ${quizAnswers[qi] === oi ? 'border-navy-400 bg-navy-50' : 'border-gray-200'}`}>
                            <input
                              type="radio"
                              name={`q-${qi}`}
                              checked={quizAnswers[qi] === oi}
                              onChange={() => {
                                const updated = [...quizAnswers];
                                updated[qi] = oi;
                                setQuizAnswers(updated);
                              }}
                              className="accent-navy-600"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setActiveQuiz(null)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={submitQuiz}
                    disabled={quizAnswers.includes(-1)}
                    className="flex-1 px-4 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40"
                  >
                    Submit Quiz
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className={`text-4xl font-bold mb-2 ${(quizScore ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{quizScore}%</div>
                <p className="text-sm text-gray-600 mb-4">{(quizScore ?? 0) >= 80 ? 'Great job! You passed.' : 'Keep studying and try again.'}</p>
                <button onClick={() => setActiveQuiz(null)} className="px-6 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
