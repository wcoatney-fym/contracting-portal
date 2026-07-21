import React, { useState, useEffect } from 'react';
import { Video, ExternalLink, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LiveSession } from './hubTypes';
import { formatSessionTime } from './hubHelpers';

interface SessionsTabProps {
  liveSessions: LiveSession[];
  onLiveClick: (s: LiveSession) => void;
}

type PastSession = {
  id: string;
  title: string;
  session_datetime: string;
  recording_url: string | null;
};

export const SessionsTab: React.FC<SessionsTabProps> = ({
  liveSessions, onLiveClick,
}) => {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    loadPastSessions();
  }, []);

  const loadPastSessions = async () => {
    setLoadingPast(true);
    const { data } = await supabase
      .from('agent_live_sessions')
      .select('id, title, session_datetime, recording_url')
      .eq('is_active', true)
      .lt('session_datetime', new Date().toISOString())
      .order('session_datetime', { ascending: false })
      .limit(20);
    setPastSessions((data ?? []) as PastSession[]);
    setLoadingPast(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Upcoming Sessions ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-navy-600" />
          <h2 className="text-sm font-bold text-gray-900">Upcoming Sessions</h2>
          <span className="ml-auto text-xs text-gray-400">
            {liveSessions.length} upcoming
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {liveSessions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No upcoming sessions — check back soon.</p>
          ) : liveSessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-9 h-9 bg-navy-50 rounded-xl flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatSessionTime(s.session_datetime)}</p>
              </div>
              <button
                onClick={() => onLiveClick(s)}
                className="shrink-0 inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-semibold border border-navy-200 hover:border-navy-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                Join <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Past Sessions ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Past Sessions</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {loadingPast ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-600" />
            </div>
          ) : pastSessions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No past sessions yet.</p>
          ) : pastSessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-700">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatSessionTime(s.session_datetime)}</p>
              </div>
              {s.recording_url && (
                <a
                  href={s.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-semibold border border-navy-200 hover:border-navy-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Watch <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
