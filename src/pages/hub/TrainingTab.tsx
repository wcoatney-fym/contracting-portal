import React, { useState } from 'react';
import {
  CheckCircle2, Video, FileText, ExternalLink, BookOpen,
} from 'lucide-react';
import type { TrainingContent } from './hubTypes';

interface TrainingTabProps {
  training: TrainingContent[];
  completedContent: Set<string>;
  onContentClick: (c: TrainingContent) => void;
  onQuizStart: (c: TrainingContent) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({
  training, completedContent, onContentClick, onQuizStart,
}) => {
  const completedModules = training.filter(c => completedContent.has(c.id)).length;
  const totalModules = training.length;

  return (
    <div className="space-y-5">

      {/* ── Progress summary ────────────────────────────────────────────── */}
      {totalModules > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Training Progress</p>
            <p className="text-xs font-bold text-emerald-700">{completedModules}/{totalModules}</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalModules > 0 ? Math.max(Math.round((completedModules / totalModules) * 100), 4) : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {completedModules === totalModules
              ? '✅ All modules complete — great work!'
              : `${totalModules - completedModules} module${totalModules - completedModules !== 1 ? 's' : ''} remaining`
            }
          </p>
        </div>
      )}

      {/* ── Training Library ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Training Library</h2>
          {totalModules > 0 && (
            <span className="text-xs text-gray-400">{completedModules}/{totalModules} complete</span>
          )}
        </div>
        {training.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Training content coming soon.</p>
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
                          onClick={() => onContentClick(c)}
                          className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-medium"
                        >
                          {c.content_type === 'video' ? 'Watch' : 'Open'} <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      {c.has_quiz && c.quiz_questions.length > 0 && (
                        <button
                          onClick={() => onQuizStart(c)}
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
    </div>
  );
};
