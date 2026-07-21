import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Home, TrendingUp, BookOpen, Video } from 'lucide-react';
import type { AgentPipelineStage } from '../../lib/supabase';
import type { HubAgent, WnSubmission, TrainingContent, LiveSession, HubTab } from './hubTypes';
import { TYLER_BOOKING_URL } from './hubHelpers';
import { HomeTab } from './HomeTab';
import { ProgressTab } from './ProgressTab';
import { TrainingTab } from './TrainingTab';
import { SessionsTab } from './SessionsTab';
import { FloatingChatbot } from './FloatingChatbot';

// ── Tab config ───────────────────────────────────────────────────────────────
const TABS: { key: HubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'home',     label: 'Home',     icon: Home },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'training', label: 'Training', icon: BookOpen },
  { key: 'sessions', label: 'Sessions', icon: Video },
];

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
  const [activeTab, setActiveTab]       = useState<HubTab>('home');

  // Quiz modal state
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

    const completed = new Set<string>(
      (eventRows ?? []).map(e => e.content_id).filter(Boolean) as string[]
    );

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
    </div>
  );

  if (notFound || !agent) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hub Not Found</h2>
        <p className="text-gray-500 text-sm">
          This link doesn't exist or has been deactivated.<br />
          Contact <a href="mailto:Contracting@teamfym.com" className="text-navy-600 hover:underline">Contracting@teamfym.com</a>
        </p>
      </div>
    </div>
  );

  const firstName = agent.first_name ?? 'Agent';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-navy-800 text-white px-4 pt-8 pb-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-navy-300 text-xs uppercase tracking-widest mb-1">FYM Financial</p>
          <h1 className="text-2xl font-bold">Hey {firstName}! 👋</h1>
          {agent.agency && <p className="text-navy-300 text-sm mt-0.5">{agent.agency}</p>}
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors relative
                  ${active ? 'text-navy-700' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-navy-700 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'home' && (
          <HomeTab
            agent={agent}
            training={training}
            liveSessions={liveSessions}
            completedContent={completedContent}
            onSwitchTab={setActiveTab}
            onLiveClick={handleLiveClick}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab
            agent={agent}
            wnSubmissions={wnSubmissions}
            verifiedCarriers={verifiedCarriers}
            onWnSubmissionAdded={(sub) => setWnSubmissions(prev => [sub, ...prev])}
            onTylerClick={handleTylerClick}
          />
        )}

        {activeTab === 'training' && (
          <TrainingTab
            training={training}
            completedContent={completedContent}
            onContentClick={handleContentClick}
            onQuizStart={startQuiz}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            liveSessions={liveSessions}
            onLiveClick={handleLiveClick}
          />
        )}
      </div>

      {/* ── Quiz Modal ─────────────────────────────────────────────────────── */}
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

      {/* ── Floating Chatbot ───────────────────────────────────────────────── */}
      <FloatingChatbot />
    </div>
  );
};
