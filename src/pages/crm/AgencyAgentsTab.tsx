import React, { useState, useEffect } from 'react';
import { Users, Search, CheckCircle2, Clock, AlertTriangle, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Agent } from '../../lib/supabase';

interface AgencyAgentsTabProps {
  agencyName: string;
  agencyId: string;
}

type PipelineAgent = {
  id: string;
  agent_id: string;
  stage: string;
  created_at: string;
};

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  'contracting-started': 'bg-amber-100 text-amber-800',
  'contracting-complete': 'bg-teal-100 text-teal-800',
  completed: 'bg-emerald-100 text-emerald-800',
  terminated: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-red-100 text-red-800',
  terminated: 'bg-red-100 text-red-800',
};

export const AgencyAgentsTab: React.FC<AgencyAgentsTabProps> = ({ agencyName }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pipelineAgents, setPipelineAgents] = useState<PipelineAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const [agentsRes, pipelineRes] = await Promise.all([
        supabase.from('agents').select('*').eq('agency', agencyName).order('last_name'),
        supabase.from('crm_pipeline').select('*').order('created_at', { ascending: false }),
      ]);

      setAgents(agentsRes.data || []);
      setPipelineAgents(pipelineRes.data || []);
      setLoading(false);
    };
    load();
  }, [agencyName]);

  const pipelineMap = new Map<string, PipelineAgent>();
  for (const pa of pipelineAgents) {
    pipelineMap.set(pa.agent_id, pa);
  }

  const filtered = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="text-sm text-gray-500">
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contracting Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipeline Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((agent) => {
                const pipeline = pipelineMap.get(agent.id);
                return (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {agent.first_name} {agent.last_name}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{agent.email}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">{agent.form_type}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[agent.status] || 'bg-gray-100 text-gray-600'}`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {pipeline ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_COLORS[pipeline.stage] || 'bg-gray-100 text-gray-600'}`}>
                          {pipeline.stage.replace(/-/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not in pipeline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {agents.length === 0 ? 'No agents found for this agency' : 'No agents match your search'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
