import React, { useState } from 'react';
import {
  CheckCircle2, Lock, CalendarCheck, Zap, AlertCircle, Mail, Clock, Loader2,
} from 'lucide-react';
import type { HubAgent, WnSubmission } from './hubTypes';
import { stageIndex, STAGE_CHECKLIST, TYLER_BOOKING_URL } from './hubHelpers';
import { WritingNumberUpload } from './WritingNumberUpload';

interface ProgressTabProps {
  agent: HubAgent;
  wnSubmissions: WnSubmission[];
  verifiedCarriers: Set<'UNL' | 'GTL'>;
  onWnSubmissionAdded: (sub: WnSubmission) => void;
  onTylerClick: () => void;
  onStepComplete: (stepKey: string) => Promise<void>;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  agent, wnSubmissions, verifiedCarriers, onWnSubmissionAdded, onTylerClick, onStepComplete,
}) => {
  const stageIdx = stageIndex(agent.stage);
  const completedStages = stageIdx + 1;
  const totalStages = STAGE_CHECKLIST.length;
  const [markingStep, setMarkingStep] = useState<string | null>(null);

  const handleMarkComplete = async (stepKey: string) => {
    setMarkingStep(stepKey);
    try {
      await onStepComplete(stepKey);
    } finally {
      setMarkingStep(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Contracting Steps ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Contracting Steps</h2>
          <span className="text-xs text-gray-400">{completedStages} of {totalStages} complete</span>
        </div>

        <div className="px-5 py-4">
          {STAGE_CHECKLIST.map((s, i) => {
            const done    = i < stageIdx;
            const current = i === stageIdx;
            const locked  = i > stageIdx;
            const isLast  = i === STAGE_CHECKLIST.length - 1;
            const agentMarked = s.agentCompletable ? !!agent.completed_steps[s.agentCompletable] : false;
            const isMarking = s.agentCompletable === markingStep;

            return (
              <div key={s.key} className="flex gap-4">
                {/* Line + icon column */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10
                    ${done    ? 'bg-emerald-500 border-emerald-500' : ''}
                    ${current && agentMarked ? 'bg-amber-100 border-amber-400' : ''}
                    ${current && !agentMarked ? 'bg-white border-navy-600' : ''}
                    ${locked  ? 'bg-white border-gray-200' : ''}
                  `}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : current && agentMarked
                        ? <Clock className="w-4 h-4 text-amber-500" />
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
                  {/* Agent self-completion button */}
                  {current && s.agentCompletable && !agentMarked && (
                    <button
                      onClick={() => handleMarkComplete(s.agentCompletable!)}
                      disabled={isMarking}
                      className="mt-2.5 inline-flex items-center gap-1.5 bg-navy-700 hover:bg-navy-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isMarking ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> {s.agentActionLabel}</>
                      )}
                    </button>
                  )}
                  {/* Pending approval state */}
                  {current && agentMarked && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5" /> Pending Approval
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Writing Number Upload — primary action at In Contracting, persistent utility after ── */}
      {stageIdx >= 4 && (
        <WritingNumberUpload
          agentId={agent.agent_id}
          verifiedCarriers={verifiedCarriers}
          existingSubmissions={wnSubmissions}
          onSubmissionAdded={onWnSubmissionAdded}
          isPrimaryAction={agent.stage === 'in_contracting'}
        />
      )}

      {/* ── Schedule Test with Tyler ──────────────────────────────────────── */}
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
                onClick={onTylerClick}
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

      {/* ── Contact Bianca ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-gray-900">Questions?</h2>
          <p className="text-xs text-gray-500 mt-1">
            Reach out to the contracting team for help with your onboarding.
          </p>
          <a
            href="mailto:Contracting@teamfym.com"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
          >
            <Mail className="w-3 h-3" /> Contracting@teamfym.com
          </a>
        </div>
      </div>
    </div>
  );
};
