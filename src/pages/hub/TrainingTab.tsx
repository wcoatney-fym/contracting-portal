import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, Video, FileText, ExternalLink, BookOpen, Download, Filter,
} from 'lucide-react';
import type { TrainingContent } from './hubTypes';

interface TrainingTabProps {
  training: TrainingContent[];
  completedContent: Set<string>;
  onContentClick: (c: TrainingContent) => void;
  onQuizStart: (c: TrainingContent) => void;
}

const CARRIER_ORDER = ['All', 'UNL', 'GTL', 'AHL', 'Ameritas', 'General'] as const;

const CARRIER_COLORS: Record<string, string> = {
  UNL: 'bg-blue-50 text-blue-700 border-blue-200',
  GTL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AHL: 'bg-purple-50 text-purple-700 border-purple-200',
  Ameritas: 'bg-amber-50 text-amber-700 border-amber-200',
  General: 'bg-gray-50 text-gray-700 border-gray-200',
};

export const TrainingTab: React.FC<TrainingTabProps> = ({
  training, completedContent, onContentClick, onQuizStart,
}) => {
  const [activeCarrier, setActiveCarrier] = useState<string>('All');

  // Derive available carriers from data (only show tabs for carriers that have content)
  const availableCarriers = useMemo(() => {
    const carriers = new Set(training.map(c => c.carrier ?? 'General'));
    return CARRIER_ORDER.filter(c => c === 'All' || carriers.has(c));
  }, [training]);

  // Filter by carrier
  const filtered = useMemo(() => {
    if (activeCarrier === 'All') return training;
    return training.filter(c => (c.carrier ?? 'General') === activeCarrier);
  }, [training, activeCarrier]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, TrainingContent[]>();
    for (const c of filtered) {
      const cat = c.category ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const completedModules = training.filter(c => completedContent.has(c.id)).length;
  const totalModules = training.length;
  const filteredCompleted = filtered.filter(c => completedContent.has(c.id)).length;

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

      {/* ── Carrier filter pills ───────────────────────────────────────── */}
      {availableCarriers.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {availableCarriers.map(carrier => (
            <button
              key={carrier}
              onClick={() => setActiveCarrier(carrier)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border
                ${activeCarrier === carrier
                  ? 'bg-navy-700 text-white border-navy-700 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
            >
              {carrier === 'All' ? `All (${totalModules})` : carrier}
            </button>
          ))}
        </div>
      )}

      {/* ── Grouped Content ────────────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No training content yet.</p>
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Category header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">{category}</h3>
              <span className="text-xs text-gray-400">
                {items.filter(c => completedContent.has(c.id)).length}/{items.length}
              </span>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {items.map(c => {
                const done = completedContent.has(c.id);
                const isVideo = (c.content_format ?? c.content_type) === 'video';
                const carrierColor = CARRIER_COLORS[c.carrier ?? 'General'] ?? CARRIER_COLORS.General;

                return (
                  <div key={c.id} className={`flex items-start gap-3 px-5 py-4 ${done ? 'bg-emerald-50/40' : ''}`}>
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : isVideo
                          ? <Video className="w-4 h-4 text-gray-400" />
                          : <FileText className="w-4 h-4 text-gray-400" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${done ? 'text-emerald-700' : 'text-gray-900'}`}>{c.title}</p>
                        {activeCarrier === 'All' && c.carrier && c.carrier !== 'General' && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${carrierColor}`}>
                            {c.carrier}
                          </span>
                        )}
                        {isVideo && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                            VIDEO
                          </span>
                        )}
                      </div>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>}

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-2">
                        {c.content_url && (
                          <button
                            onClick={() => onContentClick(c)}
                            className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 text-xs font-medium"
                          >
                            {isVideo ? (
                              <><Download className="w-3 h-3" /> Download</>
                            ) : (
                              <><ExternalLink className="w-3 h-3" /> Open</>
                            )}
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

                    {/* Status */}
                    {done && (
                      <span className="shrink-0 text-xs text-emerald-600 font-medium mt-1">Complete</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
