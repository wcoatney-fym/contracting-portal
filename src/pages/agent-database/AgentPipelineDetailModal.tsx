import React, { useState } from 'react';
import { X, User, Mail, Phone, Building2, Clock, PenLine, StickyNote, Save, Loader2, ArrowRightLeft, Tag, FileText, ListChecks, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgentPipelineRecord, AgentPipelineStage, AgentPipelineStageStep } from '../../lib/supabase';
import { STAGES } from './AgentPipelineBoard';
import { computeProgress } from './pipelineProgress';

const STAGE_LABELS: Record<string, string> = {
  hip_broker: 'HIP Broker',
  hip_career: 'HIP Career',
  iaa: 'IAA',
  signed_iaa: 'Signed IAA',
  bill_com: 'Bill.com',
  crm: 'CRM',
  in_contracting: 'In Contracting (Carriers)',
  rts: 'RTS',
  hip_broker_ready: 'HIP Broker READY',
  hip_career_ready: 'HIP Career READY',
  actively_selling: 'Actively Selling',
  terminated: 'Terminated',
};

interface AgentPipelineDetailModalProps {
  record: AgentPipelineRecord;
  stageSteps: AgentPipelineStageStep[];
  onClose: () => void;
  onRecordUpdated: (updated: AgentPipelineRecord) => void;
  onStageChange: (recordId: string, newStage: AgentPipelineStage) => Promise<void>;
}

export const AgentPipelineDetailModal: React.FC<AgentPipelineDetailModalProps> = ({
  record,
  stageSteps,
  onClose,
  onRecordUpdated,
  onStageChange,
}) => {
  const [togglingStep, setTogglingStep] = useState<string | null>(null);
  const progress = computeProgress(record, stageSteps);

  const toggleStep = async (stepId: string) => {
    setTogglingStep(stepId);
    const current = { ...(record.completed_steps || {}) };
    if (current[stepId]) {
      delete current[stepId];
    } else {
      current[stepId] = new Date().toISOString();
    }
    const { error } = await supabase
      .from('agent_pipeline')
      .update({ completed_steps: current, updated_at: new Date().toISOString() })
      .eq('id', record.id);
    if (!error) {
      onRecordUpdated({ ...record, completed_steps: current });
    }
    setTogglingStep(null);
  };

  const [writingNumbers, setWritingNumbers] = useState(record.writing_numbers || '');
  const [notes, setNotes] = useState(record.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [pendingStage, setPendingStage] = useState<AgentPipelineStage>(record.stage);

  const isReadyStage = record.stage === 'hip_broker_ready' || record.stage === 'hip_career_ready';
  const hasChanges =
    writingNumbers !== (record.writing_numbers || '') ||
    notes !== (record.notes || '');

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('agent_pipeline')
      .update({
        writing_numbers: writingNumbers || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (!error) {
      onRecordUpdated({
        ...record,
        writing_numbers: writingNumbers || null,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleStageSelect = async (newStage: AgentPipelineStage) => {
    if (newStage === record.stage) return;
    setPendingStage(newStage);
    setMovingStage(true);
    await onStageChange(record.id, newStage);
    setMovingStage(false);
  };

  const stageEnteredDate = new Date(record.stage_entered_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-steel-200 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center">
              <User className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-steel-900">{record.agent_name || 'Unnamed Agent'}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                record.stage === 'terminated' ? 'bg-red-100 text-red-700' :
                record.stage === 'actively_selling' ? 'bg-amber-100 text-amber-700' :
                record.stage.includes('ready') ? 'bg-green-100 text-green-700' :
                'bg-navy-100 text-navy-700'
              }`}>
                {STAGE_LABELS[record.stage] || record.stage}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-steel-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-steel-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Move Stage */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Move to Stage
            </label>
            <div className="relative">
              <select
                value={pendingStage}
                onChange={(e) => handleStageSelect(e.target.value as AgentPipelineStage)}
                disabled={movingStage}
                className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent appearance-none bg-white disabled:opacity-50"
              >
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label}{s.key === record.stage ? ' (current)' : ''}
                  </option>
                ))}
              </select>
              {movingStage && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-navy-600" />
                </div>
              )}
            </div>
          </div>

          {/* Step Checklist */}
          {progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
                  <ListChecks className="w-3.5 h-3.5" /> Steps
                </h3>
                <span className={`text-xs font-semibold ${progress.allComplete ? 'text-emerald-600' : 'text-steel-500'}`}>
                  {progress.completedCount}/{progress.total} complete
                </span>
              </div>
              <div className="h-1.5 w-full bg-steel-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress.allComplete ? 'bg-emerald-500' : 'bg-navy-500'}`}
                  style={{ width: `${Math.round(progress.fraction * 100)}%` }}
                />
              </div>
              <div className="space-y-1.5 pt-1">
                {progress.steps.map(step => {
                  const doneAt = record.completed_steps?.[step.id];
                  return (
                    <button
                      key={step.id}
                      onClick={() => toggleStep(step.id)}
                      disabled={togglingStep === step.id}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                        doneAt ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-steel-200 hover:bg-steel-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                        doneAt ? 'bg-emerald-500 border-emerald-500' : 'border-steel-300'
                      }`}>
                        {togglingStep === step.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-steel-400" />
                        ) : doneAt ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : null}
                      </span>
                      <span className={`text-sm flex-1 ${doneAt ? 'text-steel-700' : 'text-steel-800'}`}>
                        {step.label}
                      </span>
                      {doneAt && (
                        <span className="text-[10px] text-steel-400 flex-shrink-0">
                          {new Date(doneAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
                <Tag className="w-3.5 h-3.5" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {record.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-navy-50 text-navy-700 border border-navy-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Intake Form / Custom Fields */}
          {record.custom_fields && Object.keys(record.custom_fields).length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
                <FileText className="w-3.5 h-3.5" /> Intake Information
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(record.custom_fields)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-3 p-3 bg-steel-50 rounded-lg">
                      <span className="text-xs font-medium text-steel-500">{key}</span>
                      <span className="text-sm text-steel-800 text-right break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-steel-500">Contact Information</h3>
            <div className="grid grid-cols-1 gap-2">
              {record.email && (
                <div className="flex items-center gap-3 p-3 bg-steel-50 rounded-lg">
                  <Mail className="w-4 h-4 text-steel-400" />
                  <span className="text-sm text-steel-700">{record.email}</span>
                </div>
              )}
              {record.phone && (
                <div className="flex items-center gap-3 p-3 bg-steel-50 rounded-lg">
                  <Phone className="w-4 h-4 text-steel-400" />
                  <span className="text-sm text-steel-700">{record.phone}</span>
                </div>
              )}
              {record.agency && (
                <div className="flex items-center gap-3 p-3 bg-steel-50 rounded-lg">
                  <Building2 className="w-4 h-4 text-steel-400" />
                  <span className="text-sm text-steel-700">{record.agency}</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-steel-50 rounded-lg">
                <Clock className="w-4 h-4 text-steel-400" />
                <span className="text-sm text-steel-700">
                  In stage since {stageEnteredDate}
                </span>
              </div>
            </div>
          </div>

          {/* Writing Numbers - only for READY stages */}
          {isReadyStage && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
                <PenLine className="w-3.5 h-3.5" />
                Writing Numbers
              </label>
              <input
                type="text"
                value={writingNumbers}
                onChange={(e) => setWritingNumbers(e.target.value)}
                placeholder="Enter writing numbers..."
                className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-steel-500">
              <StickyNote className="w-3.5 h-3.5" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={4}
              className="w-full px-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-sm text-emerald-600 font-medium">Saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
