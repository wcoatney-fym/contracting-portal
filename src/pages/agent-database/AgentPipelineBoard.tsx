import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Clock, User, Building2, Filter, PenLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AgentPipelineRecord, AgentPipelineStage } from '../../lib/supabase';
import { AgentPipelineDetailModal } from './AgentPipelineDetailModal';

const STAGES: { key: AgentPipelineStage; label: string; color: string }[] = [
  { key: 'hip_broker', label: 'HIP Broker', color: 'bg-blue-50 border-blue-200' },
  { key: 'hip_career', label: 'HIP Career', color: 'bg-indigo-50 border-indigo-200' },
  { key: 'iaa', label: 'IAA', color: 'bg-violet-50 border-violet-200' },
  { key: 'signed_iaa', label: 'Signed IAA', color: 'bg-purple-50 border-purple-200' },
  { key: 'bill_com', label: 'Bill.com', color: 'bg-fuchsia-50 border-fuchsia-200' },
  { key: 'crm', label: 'CRM', color: 'bg-cyan-50 border-cyan-200' },
  { key: 'in_contracting', label: 'In Contracting (Carriers)', color: 'bg-teal-50 border-teal-200' },
  { key: 'rts', label: 'RTS', color: 'bg-emerald-50 border-emerald-200' },
  { key: 'hip_broker_ready', label: 'HIP Broker READY', color: 'bg-green-50 border-green-200' },
  { key: 'hip_career_ready', label: 'HIP Career READY', color: 'bg-lime-50 border-lime-200' },
  { key: 'actively_selling', label: 'Actively Selling', color: 'bg-amber-50 border-amber-200' },
  { key: 'terminated', label: 'Terminated', color: 'bg-red-50 border-red-200' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export const AgentPipelineBoard: React.FC = () => {
  const [records, setRecords] = useState<AgentPipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AgentPipelineRecord | null>(null);
  const [agencies, setAgencies] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('agent_pipeline')
      .select('*')
      .order('stage_entered_at', { ascending: false });

    if (data) {
      setRecords(data);
      const uniqueAgencies = [...new Set(data.map(r => r.agency).filter(Boolean))] as string[];
      uniqueAgencies.sort();
      setAgencies(uniqueAgencies);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = records.filter(r => {
    if (search && !r.agent_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (agencyFilter && r.agency !== agencyFilter) return false;
    return true;
  });

  const groupedByStage = STAGES.map(stage => ({
    ...stage,
    records: filtered.filter(r => r.stage === stage.key),
  }));

  const totalCount = filtered.length;

  const handleRecordUpdated = (updated: AgentPipelineRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRecord(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full pl-10 pr-4 py-2 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent bg-white appearance-none"
          >
            <option value="">All Agencies</option>
            {agencies.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 border border-steel-200 rounded-lg text-sm text-steel-600 hover:bg-steel-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <span className="text-sm text-steel-500 ml-auto">
          {totalCount} agent{totalCount !== 1 ? 's' : ''} in pipeline
        </span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max h-full">
          {groupedByStage.map(col => (
            <div
              key={col.key}
              className={`w-[220px] flex-shrink-0 rounded-xl border ${col.color} flex flex-col`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-inherit">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-steel-700 truncate pr-2">
                    {col.label}
                  </h3>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    col.key === 'terminated' ? 'bg-red-200 text-red-700' : 'bg-white/80 text-steel-600 border border-steel-200'
                  }`}>
                    {col.records.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-320px)]">
                {col.records.map(record => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="w-full text-left bg-white rounded-lg border border-steel-200 p-3 shadow-sm hover:shadow-md hover:border-steel-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-steel-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-semibold text-steel-800 line-clamp-2 leading-tight">
                        {record.agent_name || 'Unnamed'}
                      </span>
                    </div>
                    {record.agency && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Building2 className="w-3 h-3 text-steel-400" />
                        <span className="text-[11px] text-steel-500 truncate">{record.agency}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-steel-400" />
                        <span className="text-[11px] text-steel-400">{timeAgo(record.stage_entered_at)}</span>
                      </div>
                      {(col.key === 'hip_broker_ready' || col.key === 'hip_career_ready') && record.writing_numbers && (
                        <div className="flex items-center gap-1">
                          <PenLine className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-medium truncate max-w-[60px]">
                            {record.writing_numbers}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {col.records.length === 0 && (
                  <div className="text-center py-6 text-xs text-steel-400">
                    No agents
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <AgentPipelineDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onRecordUpdated={handleRecordUpdated}
        />
      )}
    </div>
  );
};
