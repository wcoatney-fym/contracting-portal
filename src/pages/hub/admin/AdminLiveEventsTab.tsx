import React, { useState, useMemo } from 'react';
import {
  Video, Users, Calendar, ExternalLink, Plus, X, Clock,
  ChevronDown, Loader2, CheckCircle2, Trash2,
} from 'lucide-react';
import type { LiveSessionItem, LiveAttendance } from './adminTypes';
import { timeAgo, formatDate, formatDateShort, agentDisplayName } from './adminHelpers';

interface Props {
  sessions: LiveSessionItem[];
  attendance: LiveAttendance[];
  agentNames: Map<string, string>;
  onCreateSession: (title: string, datetime: string, joinUrl: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
}

type ViewFilter = 'upcoming' | 'past' | 'all';

export const AdminLiveEventsTab: React.FC<Props> = ({
  sessions, attendance, agentNames, onCreateSession, onDeleteSession,
}) => {
  const [filter, setFilter] = useState<ViewFilter>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDatetime, setNewDatetime] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const now = Date.now();

  // Build attendance map: session_id → agent_ids[]
  const attendanceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of attendance) {
      if (!map.has(a.session_id)) map.set(a.session_id, []);
      map.get(a.session_id)!.push(a.agent_id);
    }
    return map;
  }, [attendance]);

  // Filter sessions
  const filtered = useMemo(() => {
    let list = [...sessions].sort((a, b) => new Date(a.session_datetime).getTime() - new Date(b.session_datetime).getTime());
    if (filter === 'upcoming') list = list.filter(s => new Date(s.session_datetime).getTime() > now);
    else if (filter === 'past') list = list.filter(s => new Date(s.session_datetime).getTime() <= now);
    return list;
  }, [sessions, filter, now]);

  // Aggregate stats
  const totalSessions = sessions.length;
  const upcomingSessions = sessions.filter(s => new Date(s.session_datetime).getTime() > now).length;
  const totalAttendees = new Set(attendance.map(a => a.agent_id)).size;
  const avgAttendance = useMemo(() => {
    const pastSessions = sessions.filter(s => new Date(s.session_datetime).getTime() <= now);
    if (!pastSessions.length) return 0;
    const total = pastSessions.reduce((s, sess) => s + (attendanceMap.get(sess.id)?.length ?? 0), 0);
    return Math.round(total / pastSessions.length);
  }, [sessions, attendanceMap, now]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDatetime || !newUrl.trim()) return;
    setCreating(true);
    const ok = await onCreateSession(newTitle.trim(), newDatetime, newUrl.trim());
    setCreating(false);
    if (ok) {
      showToast('Session created', 'success');
      setShowCreate(false);
      setNewTitle('');
      setNewDatetime('');
      setNewUrl('');
    } else {
      showToast('Failed to create session', 'error');
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    const ok = await onDeleteSession(sessionId);
    if (ok) showToast('Session deleted', 'success');
    else showToast('Failed to delete session', 'error');
  };

  return (
    <div className="space-y-6">

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-4 h-4 text-navy-600" />} label="Total Sessions" value={totalSessions} />
        <StatCard icon={<Clock className="w-4 h-4 text-blue-500" />} label="Upcoming" value={upcomingSessions} />
        <StatCard icon={<Users className="w-4 h-4 text-emerald-500" />} label="Unique Attendees" value={totalAttendees} />
        <StatCard icon={<Video className="w-4 h-4 text-violet-500" />} label="Avg Attendance" value={avgAttendance} />
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['upcoming', 'past', 'all'] as ViewFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Session
        </button>
      </div>

      {/* ── Session List ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No sessions match this filter.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => {
              const isPast = new Date(s.session_datetime).getTime() <= now;
              const attendees = attendanceMap.get(s.id) ?? [];
              const expanded = expandedSession === s.id;

              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedSession(expanded ? null : s.id)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPast ? 'bg-gray-100' : 'bg-navy-100'}`}>
                        <Video className={`w-5 h-5 ${isPast ? 'text-gray-400' : 'text-navy-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>{s.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.session_datetime)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" /> {attendees.length}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-4 bg-gray-50/30">
                      <div className="flex items-center gap-3 mb-3">
                        <a href={s.join_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-800">
                          <ExternalLink className="w-3 h-3" /> Join Link
                        </a>
                        <button onClick={() => handleDelete(s.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 ml-auto">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>

                      {attendees.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No attendees yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attendees ({attendees.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {attendees.map(agentId => (
                              <span key={agentId} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {agentNames.get(agentId) ?? 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">New Live Session</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. FYM Weekly Call"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Date & Time</label>
                <input type="datetime-local" value={newDatetime} onChange={e => setNewDatetime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Join URL</label>
                <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newDatetime || !newUrl.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40 flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p></div>
      <p className="text-xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
