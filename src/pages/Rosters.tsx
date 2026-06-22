import React, { useState } from 'react';
import { Database, Building2 } from 'lucide-react';
import { AgentDatabase } from './AgentDatabase';
import { AgencyRostersTab } from './rosters/AgencyRostersTab';

type Tab = 'internal' | 'agency';

export const Rosters: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('internal');

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-center gap-1 p-1 bg-steel-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('internal')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'internal'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            FYM Internal Agent Database
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'agency'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Agency Rosters
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'internal' ? <AgentDatabase /> : <AgencyRostersTab />}
      </div>
    </div>
  );
};
