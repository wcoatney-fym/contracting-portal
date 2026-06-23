import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Plus, Search, Building2, Users, ChevronDown, ChevronRight, Monitor, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency } from '../lib/supabase';
import { AgencyDetailPanel } from './hierarchy/AgencyDetailPanel';

type AgencyNode = CrmAgency & {
  children: AgencyNode[];
  agentCount: number;
};

export const Hierarchy: React.FC = () => {
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedAgency, setSelectedAgency] = useState<CrmAgency | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [agencyRes, agentRes] = await Promise.all([
      supabase.from('crm_agencies').select('*').order('name'),
      supabase.from('agents').select('agency').eq('status', 'completed'),
    ]);

    const allAgencies = agencyRes.data || [];
    setAgencies(allAgencies);

    const counts: Record<string, number> = {};
    for (const agent of (agentRes.data || [])) {
      counts[agent.agency] = (counts[agent.agency] || 0) + 1;
    }
    setAgentCounts(counts);

    const mainIds = allAgencies.filter(a => a.agency_type === 'main').map(a => a.id);
    setExpandedNodes(new Set(mainIds));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const buildTree = (): AgencyNode[] => {
    const mainAgencies = agencies
      .filter(a => a.agency_type === 'main')
      .map(a => ({
        ...a,
        agentCount: agentCounts[a.name] || 0,
        children: agencies
          .filter(sub => sub.parent_agency_id === a.id)
          .map(sub => ({
            ...sub,
            agentCount: agentCounts[sub.name] || 0,
            children: agencies
              .filter(child => child.parent_agency_id === sub.id)
              .map(child => ({ ...child, agentCount: agentCounts[child.name] || 0, children: [] })),
          })),
      }));
    return mainAgencies;
  };

  const filteredTree = (): AgencyNode[] => {
    if (!search.trim()) return buildTree();
    const term = search.toLowerCase();
    const matchingIds = new Set(
      agencies.filter(a => a.name.toLowerCase().includes(term)).map(a => a.id)
    );
    const parentIds = new Set<string>();
    agencies.forEach(a => {
      if (matchingIds.has(a.id) && a.parent_agency_id) {
        parentIds.add(a.parent_agency_id);
        const parent = agencies.find(p => p.id === a.parent_agency_id);
        if (parent?.parent_agency_id) parentIds.add(parent.parent_agency_id);
      }
    });
    const visibleIds = new Set([...matchingIds, ...parentIds]);
    return buildTree().filter(node => isNodeVisible(node, visibleIds));
  };

  const isNodeVisible = (node: AgencyNode, visibleIds: Set<string>): boolean => {
    if (visibleIds.has(node.id)) return true;
    return node.children.some(child => isNodeVisible(child, visibleIds));
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAgencyUpdated = (updated: CrmAgency) => {
    setAgencies(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedAgency(updated);
  };

  const handleAddAgency = async (name: string, agencyType: 'main' | 'sub', parentId: string | null) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const portalPassword = `${name}CRMPortal!`;

    const { data, error } = await supabase
      .from('crm_agencies')
      .insert({
        name,
        agency_type: agencyType,
        parent_agency_id: parentId,
        onboarding_status: 'pending_csr_assignment',
        is_active: true,
        crm_enabled: false,
        slug,
        portal_password: portalPassword,
        date_created: new Date().toISOString().slice(0, 10),
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setAgencies(prev => [...prev, data]);
      setShowAddModal(false);
    }
    return error?.message || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  const tree = filteredTree();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center border border-navy-100">
            <GitBranch className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-900">Agency Hierarchy</h1>
            <p className="text-sm text-steel-500">Manage agencies, onboarding, and CRM enablement</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Agency
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agencies..."
          className="w-full pl-10 pr-4 py-2.5 border border-steel-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent bg-white"
        />
      </div>

      <div className="space-y-2">
        {tree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expandedNodes={expandedNodes}
            onToggle={toggleExpand}
            onSelect={setSelectedAgency}
          />
        ))}
        {tree.length === 0 && (
          <div className="text-center py-12 text-steel-500">
            {search ? 'No agencies match your search.' : 'No agencies found.'}
          </div>
        )}
      </div>

      {selectedAgency && (
        <AgencyDetailPanel
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
          onAgencyUpdated={handleAgencyUpdated}
          onRefresh={loadData}
        />
      )}

      {showAddModal && (
        <AddAgencyHierarchyModal
          agencies={agencies}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAgency}
        />
      )}
    </div>
  );
};

const TreeNode: React.FC<{
  node: AgencyNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (agency: CrmAgency) => void;
}> = ({ node, depth, expandedNodes, onToggle, onSelect }) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
          node.crm_enabled
            ? 'bg-white border-steel-200 hover:border-navy-300'
            : 'bg-steel-50 border-steel-200 hover:border-steel-300'
        }`}
        style={{ marginLeft: depth * 32 }}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="p-1 rounded-md hover:bg-steel-100 text-steel-500 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          onClick={() => onSelect(node)}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            depth === 0 ? 'bg-navy-100 text-navy-700' :
            depth === 1 ? 'bg-emerald-100 text-emerald-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            <Building2 className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-steel-900 text-sm truncate">{node.name}</span>
              {node.crm_enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                  <Monitor className="w-2.5 h-2.5" />
                  CRM
                </span>
              )}
              {node.is_test && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                  Test
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-steel-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {node.agentCount} agent{node.agentCount !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                node.agency_type === 'main' ? 'bg-navy-50 text-navy-600' : 'bg-steel-100 text-steel-600'
              }`}>
                {node.agency_type === 'main' ? 'Main' : 'Sub'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 relative">
          <div
            className="absolute top-0 bottom-0 border-l-2 border-steel-200"
            style={{ left: depth * 32 + 28 }}
          />
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AddAgencyHierarchyModal: React.FC<{
  agencies: CrmAgency[];
  onClose: () => void;
  onAdd: (name: string, agencyType: 'main' | 'sub', parentId: string | null) => Promise<string | null>;
}> = ({ agencies, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [agencyType, setAgencyType] = useState<'main' | 'sub'>('sub');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mainAgencies = agencies.filter(a => a.agency_type === 'main' && a.is_active);

  useEffect(() => {
    if (mainAgencies.length > 0 && !parentId) {
      setParentId(mainAgencies[0].id);
    }
  }, [mainAgencies, parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Agency name is required.'); return; }
    if (agencyType === 'sub' && !parentId) { setError('Select a parent agency.'); return; }

    setSubmitting(true);
    setError('');
    const err = await onAdd(name.trim(), agencyType, agencyType === 'sub' ? parentId : null);
    if (err) {
      setError(err.includes('23505') ? 'An agency with this name already exists.' : err);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <h3 className="font-semibold text-steel-900">Add New Agency</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">Agency Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="Agency name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-2">Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAgencyType('main')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  agencyType === 'main'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Main
              </button>
              <button
                type="button"
                onClick={() => setAgencyType('sub')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  agencyType === 'sub'
                    ? 'bg-navy-50 border-navy-300 text-navy-700 ring-2 ring-navy-500/20'
                    : 'bg-white border-steel-300 text-steel-700 hover:bg-steel-50'
                }`}
              >
                Sub-Agency
              </button>
            </div>
          </div>
          {agencyType === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">Parent Agency</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              >
                {mainAgencies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-steel-700 border border-steel-300 rounded-lg hover:bg-steel-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2.5 text-sm font-medium bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
