import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';
import { AgencyOnboardingView } from './AgencyOnboardingView';

const ONBOARDING_STEPS = [
  { key: 'pending_csr_assignment', label: 'CSR Assignment', short: '1' },
  { key: 'awaiting_agency_phone', label: 'Phone & Setup', short: '2' },
  { key: 'awaiting_roster_upload', label: 'Roster Upload', short: '3' },
  { key: 'awaiting_dba_upload', label: 'DBA Upload', short: '4' },
  { key: 'onboarding_complete', label: 'Complete', short: '5' },
] as const;

export const TaskboardOnboardingTab: React.FC = () => {
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgency, setSelectedAgency] = useState<CrmAgency | null>(null);
  const [pendingActionCount, setPendingActionCount] = useState(0);

  const load = async () => {
    const [agencyRes, notifRes] = await Promise.all([
      supabase
        .from('crm_agencies')
        .select('*')
        .neq('onboarding_status', 'onboarding_complete')
        .eq('is_active', true)
        .order('date_added', { ascending: false }),
      supabase
        .from('crm_notifications')
        .select('id')
        .eq('is_read', false)
        .in('type', ['roster_uploaded', 'dba_uploaded', 'no_dba_request']),
    ]);
    setAgencies(agencyRes.data || []);
    setPendingActionCount((notifRes.data || []).length);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAgencyUpdated = (updated: CrmAgency) => {
    setAgencies((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setSelectedAgency(updated);
  };

  if (selectedAgency) {
    return (
      <AgencyOnboardingView
        agency={selectedAgency}
        onBack={() => { setSelectedAgency(null); load(); }}
        onAgencyUpdated={handleAgencyUpdated}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white rounded-2xl border border-steel-200 animate-pulse" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-steel-200 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingActionCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {pendingActionCount} pending confirmation{pendingActionCount !== 1 ? 's' : ''} require your attention
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Roster or DBA uploads awaiting review</p>
          </div>
        </div>
      )}

      {agencies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-steel-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-steel-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-steel-400" />
          </div>
          <p className="text-sm font-medium text-steel-600">No agencies currently in onboarding</p>
          <p className="text-xs text-steel-400 mt-1">New agencies will appear here when they begin onboarding</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-steel-700">
              Agencies In Onboarding
            </h4>
            <span className="text-xs font-bold text-navy-600 bg-navy-50 px-2.5 py-1 rounded-full">
              {agencies.length}
            </span>
          </div>
          <div className="space-y-3">
            {agencies.map((agency) => {
              const currentStepIdx = ONBOARDING_STEPS.findIndex(
                (s) => s.key === agency.onboarding_status
              );
              const progressPercent = Math.round((currentStepIdx / (ONBOARDING_STEPS.length - 1)) * 100);

              return (
                <button
                  key={agency.id}
                  onClick={() => setSelectedAgency(agency)}
                  className="w-full bg-white rounded-2xl border border-steel-200 p-5 text-left hover:border-navy-300 hover:shadow-md transition-all duration-200 group shadow-sm"
                >
                  {/* Progress bar at top */}
                  <div className="h-1 bg-steel-100 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-navy-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                        <Building2 className="w-4.5 h-4.5 text-navy-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-steel-900 group-hover:text-navy-800 transition-colors">{agency.name}</h4>
                        <p className="text-[11px] text-steel-500 mt-0.5">
                          Added {new Date(agency.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {agency.assigned_csr && (
                        <span className="text-[11px] font-medium text-steel-600 bg-steel-100 px-2.5 py-1 rounded-lg">
                          CSR: {agency.assigned_csr}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-steel-400 group-hover:text-navy-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {ONBOARDING_STEPS.slice(0, -1).map((step, idx) => {
                      const isActive = idx === currentStepIdx;
                      const isCompleted = idx < currentStepIdx;

                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : isActive
                                  ? 'bg-navy-600 text-white ring-2 ring-navy-500/20 shadow-sm'
                                  : 'bg-steel-200 text-steel-500'
                              }`}
                            >
                              {step.short}
                            </div>
                            <span
                              className={`text-[11px] font-medium whitespace-nowrap ${
                                isActive ? 'text-navy-600' : isCompleted ? 'text-emerald-600' : 'text-steel-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < ONBOARDING_STEPS.length - 2 && (
                            <div className={`h-0.5 flex-1 min-w-[16px] rounded-full ${
                              idx < currentStepIdx ? 'bg-emerald-400' : 'bg-steel-200'
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
