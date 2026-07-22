import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { AgentPipelineStage, AgentPipelineStageStep } from '../../lib/supabase';
import {
  Lock, LayoutDashboard, Users, BookOpen, Kanban, Video,
  RefreshCw, Loader2,
} from 'lucide-react';
import type {
  AdminTab, PipelineAgent, TrainingEvent, TrainingContentItem,
  LiveSessionItem, HubLogin, LiveAttendance, AgentSummary, ContentStat, AdminAgent,
  IntakeRecord, LobAssignment,
} from './admin/adminTypes';
import { agentDisplayName, daysBetween } from './admin/adminHelpers';
import {
  AdminDashboardTab, AdminAgentsTab, AdminTrainingTab,
  AdminPipelineTab, AdminLiveEventsTab,
} from './admin';

const HUB_PASSWORD = import.meta.env.VITE_BIANCA_HUB_PASSWORD ?? 'TrainingFYM!';

const TABS: { key: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'agents',    label: 'Agents',     icon: Users },
  { key: 'training',  label: 'Training',   icon: BookOpen },
  { key: 'pipeline',  label: 'Pipeline',   icon: Kanban },
  { key: 'live',      label: 'Live Events', icon: Video },
];

export const BiancaHub: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Raw data
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [pipeline, setPipeline] = useState<PipelineAgent[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [content, setContent] = useState<TrainingContentItem[]>([]);
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [logins, setLogins] = useState<HubLogin[]>([]);
  const [attendance, setAttendance] = useState<LiveAttendance[]>([]);
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>([]);
  const [lobAssignments, setLobAssignments] = useState<LobAssignment[]>([]);
  const [stageSteps, setStageSteps] = useState<AgentPipelineStageStep[]>([]);

  // ── Data loading ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      { data: agentRows },
      { data: pipelineRows },
      { data: eventRows },
      { data: contentRows },
      { data: sessionRows },
      { data: loginRows },
      { data: attendanceRows },
      { data: intakeRows },
      { data: lobRows },
      { data: stageStepRows },
    ] = await Promise.all([
      supabase.from('agents').select('id, first_name, last_name, email, phone, agency, npn, source, status, form_type, crm_onboarded, created_at').order('created_at', { ascending: false }),
      supabase.from('agent_pipeline').select('id, agent_name, first_name, last_name, email, phone, agency, agency_id, stage, tags, last_updated_by, last_updated_by_display, updated_by_source, stage_entered_at, updated_at, completed_steps').order('updated_at', { ascending: false }),
      supabase.from('agent_training_events').select('id, agent_id, event_type, content_id, content_title, quiz_score, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('agent_training_content').select('id, title, description, content_type, content_format, carrier, category, has_quiz, display_order').eq('is_active', true).order('display_order'),
      supabase.from('agent_live_sessions').select('id, title, session_datetime, join_url, is_active').order('session_datetime', { ascending: false }),
      supabase.from('agent_hub_logins').select('id, agent_id, logged_in_at, login_method').order('logged_in_at', { ascending: false }).limit(500),
      supabase.from('agent_live_attendance').select('id, agent_id, session_id, clicked_join_at'),
      supabase.from('agent_intake').select('agent_id, date_of_birth, address, city, state, postal_code, ssn, resident_license_number, npn, resident_state, ctm_acknowledgment, agent_type, gender, release_needed, state_licenses, submitted_at'),
      supabase.from('agent_lob_assignments').select('agent_id, line_of_business, carrier, writing_number'),
      supabase.from('agent_pipeline_stage_steps').select('id, internal_stage, label, display_order, active, created_at').eq('active', true).order('display_order'),
    ]);

    if (agentRows) setAgents(agentRows);
    if (pipelineRows) setPipeline(pipelineRows);
    if (eventRows) setEvents(eventRows);
    if (contentRows) setContent(contentRows);
    if (sessionRows) setSessions(sessionRows);
    if (loginRows) setLogins(loginRows);
    if (attendanceRows) setAttendance(attendanceRows);
    if (intakeRows) setIntakeRecords(intakeRows);
    if (lobRows) setLobAssignments(lobRows);
    if (stageStepRows) setStageSteps(stageStepRows);

    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  // ── Derived data ──────────────────────────────────────────────────────

  // Agent name lookup
  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) {
      map.set(a.id, agentDisplayName(a.first_name, a.last_name, a.email ?? undefined));
    }
    return map;
  }, [agents]);

  // Intake lookup map
  const intakeMap = useMemo(() => {
    const map = new Map<string, IntakeRecord>();
    for (const r of intakeRecords) map.set(r.agent_id, r);
    return map;
  }, [intakeRecords]);

  // LOB assignments lookup map
  const lobMap = useMemo(() => {
    const map = new Map<string, LobAssignment[]>();
    for (const r of lobAssignments) {
      if (!map.has(r.agent_id)) map.set(r.agent_id, []);
      map.get(r.agent_id)!.push(r);
    }
    return map;
  }, [lobAssignments]);

  // Agent summaries for Dashboard + Agents tabs
  const agentSummaries: AgentSummary[] = useMemo(() => {
    const totalContent = content.length;

    return agents.map(a => {
      // Training events for this agent
      const agentEvents = events.filter(e => e.agent_id === a.id);
      const videoViews = agentEvents.filter(e => e.event_type === 'video_view').length;
      const quizAttempts = agentEvents.filter(e => e.event_type === 'quiz_attempt');
      const quizPasses = agentEvents.filter(e => e.event_type === 'quiz_pass');
      const liveClicks = agentEvents.filter(e => e.event_type === 'live_training_click').length;

      // Avg quiz score
      const scores = quizAttempts.filter(e => e.quiz_score !== null).map(e => e.quiz_score!);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

      // Last event
      const lastEvent = agentEvents[0]?.created_at ?? null;

      // Logins
      const agentLogins = logins.filter(l => l.agent_id === a.id);
      const lastLogin = agentLogins[0]?.logged_in_at ?? null;
      const loginCount = agentLogins.length;

      // Pipeline stage + tags — match by email (most reliable) or name
      const aEmail = (a.email ?? '').toLowerCase();
      const aName = agentDisplayName(a.first_name, a.last_name).toLowerCase();
      const pipelineRecord = pipeline.find(p => {
        if (aEmail && p.email && p.email.toLowerCase() === aEmail) return true;
        const pName = agentDisplayName(p.first_name, p.last_name, p.agent_name).toLowerCase();
        return pName === aName && aName !== 'unknown';
      });
      const stage = (pipelineRecord?.stage ?? null) as AgentPipelineStage | null;
      const stageEnteredAt = pipelineRecord?.stage_entered_at ?? null;
      const daysInStage = stageEnteredAt ? daysBetween(stageEnteredAt) : null;
      const tags = pipelineRecord?.tags ?? [];

      // Training completion — unique content IDs with quiz_pass or video_view
      const completedIds = new Set(
        agentEvents
          .filter(e => e.content_id && (e.event_type === 'quiz_pass' || e.event_type === 'video_view'))
          .map(e => e.content_id!)
      );
      const trainingPct = totalContent > 0 ? Math.round((completedIds.size / totalContent) * 100) : 0;

      return {
        agent_id: a.id,
        name: agentDisplayName(a.first_name, a.last_name, a.email ?? undefined),
        email: a.email,
        phone: a.phone,
        agency: a.agency,
        stage,
        npn: a.npn,
        form_type: a.form_type,
        crm_onboarded: a.crm_onboarded ?? false,
        tags,
        video_views: videoViews,
        quiz_attempts: quizAttempts.length,
        quiz_passes: quizPasses.length,
        avg_quiz_score: avgScore,
        live_clicks: liveClicks,
        last_event_at: lastEvent,
        last_login_at: lastLogin,
        login_count: loginCount,
        days_in_stage: daysInStage,
        stage_entered_at: stageEnteredAt,
        training_pct: trainingPct,
        intake: intakeMap.get(a.id) ?? null,
        lob_assignments: lobMap.get(a.id) ?? [],
      };
    });
  }, [agents, events, logins, pipeline, content, intakeMap, lobMap]);

  // Content stats for Training tab
  const contentStats: ContentStat[] = useMemo(() => {
    return content.map(c => {
      const contentEvents = events.filter(e => e.content_id === c.id);
      const views = contentEvents.filter(e => e.event_type === 'video_view').length;
      const attempts = contentEvents.filter(e => e.event_type === 'quiz_attempt');
      const passes = contentEvents.filter(e => e.event_type === 'quiz_pass').length;
      const scores = attempts.filter(e => e.quiz_score !== null).map(e => e.quiz_score!);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
      const passRate = attempts.length > 0 ? Math.round((passes / attempts.length) * 100) : null;

      return {
        content_id: c.id,
        title: c.title,
        carrier: c.carrier,
        category: c.category,
        has_quiz: c.has_quiz,
        view_count: views,
        quiz_attempt_count: attempts.length,
        quiz_pass_count: passes,
        avg_score: avgScore,
        pass_rate: passRate,
      };
    });
  }, [content, events]);

  // ── Actions ───────────────────────────────────────────────────────────

  const handleStageChange = async (agentId: string, newStage: AgentPipelineStage, updatedBy: string): Promise<boolean> => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-pipeline-stage`;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: agentId,
          new_stage: newStage,
          updated_by: updatedBy,
          updated_by_source: 'training_hub',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setPipeline(prev => prev.map(p =>
          p.id === agentId
            ? { ...p, stage: newStage, last_updated_by: updatedBy, last_updated_by_display: updatedBy, stage_entered_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : p
        ));
        return true;
      }
    } catch {}
    return false;
  };

  const handleCreateSession = async (title: string, datetime: string, joinUrl: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('agent_live_sessions').insert({
        title,
        session_datetime: new Date(datetime).toISOString(),
        join_url: joinUrl,
        is_active: true,
      }).select().single();
      if (error || !data) return false;
      setSessions(prev => [data, ...prev]);
      return true;
    } catch { return false; }
  };

  const handleDeleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('agent_live_sessions').update({ is_active: false }).eq('id', sessionId);
      if (error) return false;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch { return false; }
  };

  // ── Password gate ─────────────────────────────────────────────────────
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === HUB_PASSWORD) {
      setAuthed(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-steel-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-navy-700" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Training Hub</h1>
            <p className="text-sm text-gray-500 mt-1">FYM Financial — Admin Dashboard</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-4 py-3 rounded-xl border text-sm ${passwordError ? 'border-red-400 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-navy-400`}
              autoFocus
            />
            {passwordError && <p className="text-xs text-red-500">Incorrect password.</p>}
            <button type="submit" className="w-full bg-navy-700 hover:bg-navy-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-steel-50">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-navy-700 text-white py-5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-navy-200 text-xs mb-0.5">FYM Financial</p>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" /> Training Admin
            </h1>
          </div>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 text-navy-200 hover:text-white text-sm transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors relative
                  ${active ? 'text-navy-700' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-navy-700 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && agents.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-navy-400" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboardTab
                agents={agentSummaries}
                recentEvents={events}
                agentNames={agentNames}
                totalContent={content.length}
                onSwitchTab={setActiveTab}
              />
            )}

            {activeTab === 'agents' && (
              <AdminAgentsTab
                agents={agentSummaries}
                events={events}
                totalContent={content.length}
              />
            )}

            {activeTab === 'training' && (
              <AdminTrainingTab
                contentStats={contentStats}
                agents={agentSummaries}
                totalContent={content.length}
              />
            )}

            {activeTab === 'pipeline' && (
              <AdminPipelineTab
                pipeline={pipeline}
                stageSteps={stageSteps}
                onStageChange={handleStageChange}
              />
            )}

            {activeTab === 'live' && (
              <AdminLiveEventsTab
                sessions={sessions}
                attendance={attendance}
                agentNames={agentNames}
                onCreateSession={handleCreateSession}
                onDeleteSession={handleDeleteSession}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
