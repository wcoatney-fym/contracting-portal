import React, { useState } from 'react';
import { Network, Database } from 'lucide-react';
import { AgentDatabase } from '../AgentDatabase';
import { HierarchyTreeView } from './HierarchyTreeView';
import { AgencyDetailModal } from './AgencyDetailModal';
import type { CrmAgency } from '../../lib/supabase';

type Tab = 'tree' | 'agents';

export const Hierarchy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('tree');
  const [selectedAgency, setSelectedAgency] = useState<CrmAgency | null>(null);
  const [allAgencies, setAllAgencies] = useState<CrmAgency[]>([]);

  const handleSelectAgency = (agency: CrmAgency, agencies: CrmAgency[]) => {
    setSelectedAgency(agency);
    setAllAgencies(agencies);
  };

  const handleAgencyUpdated = (updated: CrmAgency) => {
    setAllAgencies(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedAgency(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-center gap-1 p-1 bg-steel-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'tree'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Network className="w-4 h-4" />
            Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'agents'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            FYM Internal Agent Database
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'tree' ? (
          <HierarchyTreeView onSelectAgency={handleSelectAgency} />
        ) : (
          <AgentDatabase />
        )}
      </div>

      {selectedAgency && (
        <AgencyDetailModal
          agency={selectedAgency}
          allAgencies={allAgencies}
          onClose={() => setSelectedAgency(null)}
          onAgencyUpdated={handleAgencyUpdated}
        />
      )}
    </div>
  );
};
