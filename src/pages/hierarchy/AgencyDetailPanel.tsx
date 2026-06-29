import React, { useState } from 'react';
import { X, FileText, Users, Monitor, Shield } from 'lucide-react';
import type { CrmAgency } from '../../lib/supabase';
import { ContractingOnboardingTab } from './ContractingOnboardingTab';
import { HierarchyRosterTab } from './HierarchyRosterTab';
import { CrmToggleTab } from './CrmToggleTab';
import { CarriersTab } from './CarriersTab';

type Tab = 'onboarding' | 'roster' | 'crm' | 'carriers';

interface AgencyDetailPanelProps {
  agency: CrmAgency;
  onClose: () => void;
  onAgencyUpdated: (updated: CrmAgency) => void;
  onRefresh: () => void;
}

export const AgencyDetailPanel: React.FC<AgencyDetailPanelProps> = ({
  agency,
  onClose,
  onAgencyUpdated,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('onboarding');

  const tabs: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'onboarding', label: 'Onboarding', icon: FileText },
    { key: 'roster', label: 'Roster', icon: Users },
    { key: 'carriers', label: 'Carriers', icon: Shield },
    { key: 'crm', label: 'CRM', icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 bg-steel-50">
          <div>
            <h2 className="text-lg font-bold text-steel-900">{agency.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                agency.agency_type === 'main' ? 'bg-navy-100 text-navy-700' : 'bg-steel-200 text-steel-600'
              }`}>
                {agency.agency_type === 'main' ? 'Main Agency' : 'Sub-Agency'}
              </span>
              {agency.crm_enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                  <Monitor className="w-3 h-3" />
                  CRM Enabled
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-steel-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-steel-500" />
          </button>
        </div>

        <div className="flex border-b border-steel-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-navy-600 text-navy-700 bg-navy-50/50'
                  : 'border-transparent text-steel-500 hover:text-steel-700 hover:bg-steel-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'onboarding' && (
            <ContractingOnboardingTab agency={agency} onAgencyUpdated={onAgencyUpdated} />
          )}
          {activeTab === 'roster' && (
            <HierarchyRosterTab agency={agency} />
          )}
          {activeTab === 'crm' && (
            <CrmToggleTab agency={agency} onAgencyUpdated={onAgencyUpdated} onRefresh={onRefresh} />
          )}
          {activeTab === 'carriers' && (
            <CarriersTab agency={agency} onAgencyUpdated={onAgencyUpdated} />
          )}
        </div>
      </div>
    </div>
  );
};
