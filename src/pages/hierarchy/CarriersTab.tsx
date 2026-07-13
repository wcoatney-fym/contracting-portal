import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';

const ALL_CARRIERS = ['UNL', 'GTL', 'AHL', 'Manhattan', 'Heartland'] as const;

interface CarriersTabProps {
  agency: CrmAgency;
  onAgencyUpdated: (updated: CrmAgency) => void;
}

export const CarriersTab: React.FC<CarriersTabProps> = ({ agency, onAgencyUpdated }) => {
  const [saving, setSaving] = useState<string | null>(null);
  const current = agency.carriers || [];

  const toggle = async (carrier: string) => {
    setSaving(carrier);
    const updated = current.includes(carrier)
      ? current.filter(c => c !== carrier)
      : [...current, carrier];

    const { error } = await supabase
      .from('hierarchy_agencies')
      .update({ carriers: updated, updated_at: new Date().toISOString() })
      .eq('id', agency.id);

    if (!error) {
      onAgencyUpdated({ ...agency, carriers: updated });
    }
    setSaving(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-steel-900">Carrier Assignments</h3>
          <p className="text-sm text-steel-500">Toggle which carriers this agency is contracted with</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ALL_CARRIERS.map(carrier => {
          const active = current.includes(carrier);
          const isSaving = saving === carrier;
          return (
            <button
              key={carrier}
              onClick={() => toggle(carrier)}
              disabled={isSaving}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                active
                  ? 'border-sky-300 bg-sky-50 shadow-sm'
                  : 'border-steel-200 bg-white hover:border-steel-300'
              } ${isSaving ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <span className={`text-sm font-semibold ${active ? 'text-sky-700' : 'text-steel-600'}`}>
                {carrier}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                active ? 'bg-sky-500 text-white' : 'bg-steel-100 text-steel-400'
              }`}>
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      {current.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-steel-50 border border-steel-200">
          <p className="text-xs font-medium text-steel-500 uppercase tracking-wider mb-2">Active Carriers</p>
          <div className="flex flex-wrap gap-2">
            {current.map(c => (
              <span key={c} className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
