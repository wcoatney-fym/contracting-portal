import React, { useState, useEffect } from 'react';
import { Monitor, AlertTriangle, CheckCircle2, Circle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';

interface CrmToggleTabProps {
  agency: CrmAgency;
  onAgencyUpdated: (updated: CrmAgency) => void;
  onRefresh: () => void;
}

const CRM_ONBOARDING_LABELS: Record<string, string> = {
  pending_csr_assignment: 'Pending CSR Assignment',
  awaiting_agency_phone: 'Awaiting Phone & Setup',
  awaiting_subaccount_setup: 'Awaiting Subaccount Setup',
  awaiting_roster_upload: 'Awaiting Roster Upload',
  awaiting_dba_upload: 'Awaiting DBA Upload',
  onboarding_complete: 'Onboarding Complete',
};

export const CrmToggleTab: React.FC<CrmToggleTabProps> = ({
  agency,
  onAgencyUpdated,
  onRefresh,
}) => {
  const [hasRoster, setHasRoster] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPrerequisites();
  }, [agency.name]);

  const checkPrerequisites = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_roster_uploads')
      .select('id')
      .eq('agency', agency.name)
      .limit(1);
    setHasRoster((data || []).length > 0);
    setLoading(false);
  };

  const handleEnable = async () => {
    setEnabling(true);
    const { error } = await supabase
      .from('crm_agencies')
      .update({
        crm_enabled: true,
        onboarding_status: 'pending_csr_assignment',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agency.id);

    if (!error) {
      const updated = {
        ...agency,
        crm_enabled: true,
        onboarding_status: 'pending_csr_assignment' as const,
        is_active: true,
      };
      onAgencyUpdated(updated);
      onRefresh();
    }
    setEnabling(false);
    setShowConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (agency.crm_enabled) {
    return (
      <div className="p-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">CRM Onboarding Enabled</h3>
              <p className="text-sm text-emerald-700 mt-1">
                This agency is visible in the CRM Team tab and is being onboarded through the CRM workflow.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-200">
            <h4 className="text-sm font-semibold text-emerald-900 mb-2">CRM Onboarding Status</h4>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                agency.onboarding_status === 'onboarding_complete'
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {CRM_ONBOARDING_LABELS[agency.onboarding_status] || agency.onboarding_status}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-100/50 rounded-lg">
            <p className="text-xs text-emerald-700 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              CRM enablement cannot be disabled from here. Contact the CRM team if changes are needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const prerequisites = [
    { label: 'Agency is active', done: agency.is_active },
    { label: 'Roster has been uploaded', done: hasRoster },
    { label: 'Agency phone provided', done: !!(agency.agency_phone?.trim()) },
  ];

  const allPrereqsMet = prerequisites.every(p => p.done);

  return (
    <div className="p-6">
      <div className="bg-steel-50 border border-steel-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-navy-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-steel-900">Enable CRM Onboarding</h3>
            <p className="text-sm text-steel-600 mt-1">
              Enabling CRM will make this agency visible in the CRM Team tab and begin
              the CRM onboarding workflow (CSR assignment, subaccount setup, etc.).
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-steel-800 mb-3">Prerequisites</h4>
          <div className="space-y-2">
            {prerequisites.map((prereq, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {prereq.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-steel-300" />
                )}
                <span className={`text-sm ${prereq.done ? 'text-steel-700' : 'text-steel-500'}`}>
                  {prereq.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-steel-200">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!allPrereqsMet}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
              allPrereqsMet
                ? 'bg-navy-600 text-white hover:bg-navy-700 shadow-sm'
                : 'bg-steel-200 text-steel-400 cursor-not-allowed'
            }`}
          >
            <Monitor className="w-4 h-4" />
            {allPrereqsMet ? 'Enable CRM Onboarding' : 'Complete prerequisites to enable'}
          </button>
          {!allPrereqsMet && (
            <p className="text-xs text-steel-500 text-center mt-2">
              All prerequisites must be met before enabling CRM.
            </p>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-steel-900">Confirm CRM Enablement</h3>
                <p className="text-sm text-steel-600 mt-1">
                  This will make <strong>{agency.name}</strong> visible in the CRM Team tab.
                </p>
              </div>
            </div>

            <div className="bg-steel-50 rounded-lg p-3 mb-4 space-y-1.5 text-sm text-steel-700">
              <p>What will happen:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-steel-600">
                <li>Agency will appear in CRM Team for onboarding</li>
                <li>CRM team begins CSR assignment, subaccount setup, etc.</li>
                <li>Existing roster will be used for CRM workflows</li>
                <li>This action cannot be undone from here</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-steel-700 border border-steel-300 rounded-lg hover:bg-steel-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnable}
                disabled={enabling}
                className="px-4 py-2.5 text-sm font-medium bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {enabling ? 'Enabling...' : 'Yes, Enable CRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
