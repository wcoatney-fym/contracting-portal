import React, { useState } from 'react';
import { X, User, Mail, Phone, Building2, Clock, PenLine, StickyNote, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgentPipelineRecord } from '../../lib/supabase';

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
  onClose: () => void;
  onRecordUpdated: (updated: AgentPipelineRecord) => void;
}

export const AgentPipelineDetailModal: React.FC<AgentPipelineDetailModalProps> = ({
  record,
  onClose,
  onRecordUpdated,
}) => {
  const [writingNumbers, setWritingNumbers] = useState(record.writing_numbers || '');
  const [notes, setNotes] = useState(record.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
