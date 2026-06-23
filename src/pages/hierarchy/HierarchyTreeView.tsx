import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Wifi,
  WifiOff,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CrmAgency } from '../../lib/supabase';
import { buildTree, type TreeNode } from './hierarchyHelpers';

interface HierarchyTreeViewProps {
  onSelectAgency: (agency: CrmAgency, allAgencies: CrmAgency[]) => void;
}

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({ onSelectAgency }) => {
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const [ghlStatuses, setGhlStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [agenciesRes, pipelineRes, ghlRes] = await Promise.all([
      supabase
        .from('crm_agencies')
        .select('*')
        .eq('is_active', true)
        .eq('is_test', false)
        .order('name'),
      supabase
        .from('crm_pipeline')
        .select('agency, stage'),
      supabase
        .from('agency_ghl_configs')
        .select('agency_id, connection_status'),
    ]);

    const agencyList = (agenciesRes.data || []) as CrmAgency[];
    setAgencies(agencyList);

    const counts: Record<string, number> = {};
    for (const row of pipelineRes.data || []) {
      const agency = agencyList.find(a => a.name === row.agency);
      if (agency) {
        counts[agency.id] = (counts[agency.id] || 0) + 1;
      }
    }
    setAgentCounts(counts);

    const statuses: Record<string, string> = {};
    for (const row of ghlRes.data || []) {
      statuses[row.agency_id] = row.connection_status;
    }
    setGhlStatuses(statuses);

    // Auto-expand all root nodes
    const tree = buildTree(agencyList);
    const expanded = new Set<string>();
    for (const node of tree) {
      expanded.add(node.agency.id);
    }
    setExpandedNodes(expanded);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  const tree = buildTree(agencies);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">FYM Agency Hierarchy</h2>
          <p className="text-sm text-gray-500 mt-1">
            Click any agency to view roster, toggles, and assets
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {tree.map((node) => (
          <TreeNodeCard
            key={node.agency.id}
            node={node}
            depth={0}
            agentCounts={agentCounts}
            ghlStatuses={ghlStatuses}
            expandedNodes={expandedNodes}
            onToggleExpand={toggleExpand}
            onSelect={(agency) => onSelectAgency(agency, agencies)}
          />
        ))}
      </div>

      {tree.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No agencies found</p>
          <p className="text-sm mt-1">Add agencies via Agency Intake to build your hierarchy.</p>
        </div>
      )}
    </div>
  );
};

const TreeNodeCard: React.FC<{
  node: TreeNode;
  depth: number;
  agentCounts: Record<string, number>;
  ghlStatuses: Record<string, string>;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (agency: CrmAgency) => void;
}> = ({ node, depth, agentCounts, ghlStatuses, expandedNodes, onToggleExpand, onSelect }) => {
  const { agency, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(agency.id);
  const agentCount = agentCounts[agency.id] || 0;
  const ghlStatus = ghlStatuses[agency.id];
  const isRoot = depth === 0 && !agency.parent_agency_id;

  return (
    <div className={depth > 0 ? 'ml-8 relative' : ''}>
      {depth > 0 && (
        <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-gray-200" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-20px] top-[24px] w-5 h-px bg-gray-200" />
      )}

      <div
        className={`group relative rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
          isRoot
            ? 'bg-gradient-to-r from-navy-600/5 to-transparent border-navy-200 hover:border-navy-400'
            : 'bg-white border-gray-200 hover:border-navy-300'
        }`}
        onClick={() => onSelect(agency)}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(agency.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            isRoot ? 'bg-navy-100' : 'bg-gray-100'
          }`}>
            <Building2 className={`w-4.5 h-4.5 ${isRoot ? 'text-navy-600' : 'text-gray-500'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold truncate ${isRoot ? 'text-navy-700 text-base' : 'text-gray-900 text-sm'}`}>
                {agency.name}
              </span>
              {agency.agency_type === 'sub' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                  <GitBranch className="w-2.5 h-2.5" />
                  Sub
                </span>
              )}
              {hasChildren && (
                <span className="text-[10px] text-gray-400 font-medium">
                  ({children.length} {children.length === 1 ? 'sub' : 'subs'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {agency.assigned_csr && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <UserCheck className="w-3 h-3" />
                  {agency.assigned_csr}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                {agentCount} agent{agentCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              agency.onboarding_status === 'onboarding_complete'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {agency.onboarding_status === 'onboarding_complete' ? 'Active' : 'Onboarding'}
            </span>

            {ghlStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-gray-300" />
            )}

            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-navy-500 transition-colors" />
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <TreeNodeCard
              key={child.agency.id}
              node={child}
              depth={depth + 1}
              agentCounts={agentCounts}
              ghlStatuses={ghlStatuses}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
