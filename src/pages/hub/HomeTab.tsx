import React from 'react';
import {
  Trophy, ArrowRight, BookOpen, Video, ExternalLink, CalendarCheck,
} from 'lucide-react';
import type { HubAgent, LiveSession, TrainingContent } from './hubTypes';
import { formatSessionTime, stageIndex, STAGE_CHECKLIST } from './hubHelpers';

interface HomeTabProps {
  agent: HubAgent;
  training: TrainingContent[];
  liveSessions: LiveSession[];
  completedContent: Set<string>;
  onSwitchTab: (tab: 'progress' | 'training' | 'sessions') => void;
  onLiveClick: (s: LiveSession) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  agent, training, liveSessions, completedContent, onSwitchTab, onLiveClick,
}) => {
  const stageIdx = stageIndex(agent.stage);
  const completedStages = stageIdx + 1;
  const totalStages = STAGE_CHECKLIST.length;
  const contractPct = Math.round((completedStages / totalStages) * 100);

  const completedModules = training.filter(c => completedContent.has(c.id)).length;
  const totalModules = training.length;
  const trainingPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const nextStep = !agent.is_rts ? STAGE_CHECKLIST[stageIdx + 1] ?? null : null;
  const nextSessions = liveSessions.slice(0, 3);

  return (
    <div className="space-y-5">

      {/* ── RTS Celebration ─────────────────────────────────────────────── */}
      {agent.is_rts && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-yellow-300 shrink-0" />
            <div>
              <p className="font-bold text-xl">You're Ready to Sell! 🎉</p>
              <p className="text-emerald-100 text-sm mt-1">All appointments are active — go write business.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress Pills ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Contracting pill */}
        <button
          onClick={() => onSwitchTab('progress')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-navy-200 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contracting</p>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-navy-500 transition-colors" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-navy-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(contractPct, 4)}%` }}
            />
          </div>
          <p className="text-xs font-bold text-navy-700">{completedStages}/{totalStages}</p>
        </button>

        {/* Training pill */}
        <button
          onClick={() => onSwitchTab('training')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-emerald-200 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</p>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: totalModules > 0 ? `${Math.max(trainingPct, 4)}%` : '0%' }}
            />
          </div>
          <p className="text-xs font-bold text-emerald-700">
            {totalModules > 0 ? `${completedModules}/${totalModules}` : '—'}
          </p>
        </button>
      </div>

      {/* ── Next Step CTA ───────────────────────────────────────────────── */}
      {nextStep && (
        <button
          onClick={() => onSwitchTab('progress')}
          className="w-full bg-white rounded-2xl border border-navy-100 shadow-sm p-4 flex items-center gap-4 hover:border-navy-300 transition-colors group"
        >
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-navy-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Next Step</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{nextStep.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{nextStep.subtitle}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-navy-500 transition-colors shrink-0" />
        </button>
      )}

      {/* ── Upcoming Sessions Strip ─────────────────────────────────────── */}
      {nextSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-navy-600" />
              <h3 className="text-sm font-bold text-gray-900">Upcoming Sessions</h3>
            </div>
            <button
              onClick={() => onSwitchTab('sessions')}
              className="text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {nextSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
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
      )}

      {/* ── Training Nudge ──────────────────────────────────────────────── */}
      {totalModules > 0 && completedModules < totalModules && (
        <button
          onClick={() => onSwitchTab('training')}
          className="w-full bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-4 hover:border-amber-300 transition-colors group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-900">
              {totalModules - completedModules} training module{totalModules - completedModules !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Complete your training to be fully prepared.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors shrink-0" />
        </button>
      )}
    </div>
  );
};
