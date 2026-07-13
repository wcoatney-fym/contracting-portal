import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Plus, Search, Building2, Users, ChevronDown, ChevronRight, Monitor, X, Trash2, AlertTriangle, Inbox, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CrmAgency, AgencyIntakeSubmission } from '../lib/supabase';
import { AgencyDetailPanel } from './hierarchy/AgencyDetailPanel';

type AgencyNode = CrmAgency & {
  children: AgencyNode[];
  agentCount: number;
};

function buildRecursiveTree(agencies: CrmAgency[], agentCounts: Record<string, number>): AgencyNode[] {
  const map = new Map<string, AgencyNode>();
  for (const a of agencies) {
    map.set(a.id, { ...a, children: [], agentCount: agentCounts[a.name] || 0 });
  }
  const roots: AgencyNode[] = [];
  for (const node of map.values()) {
    if (node.parent_agency_id && map.has(node.parent_agency_id)) {
      map.get(node.parent_agency_id)!.children.push(node);
    } else if (!node.parent_agency_id) {
      roots.push(node);
    }
  }
  const sortChildren = (nodes: AgencyNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);
  return roots;
}

function getDescendantIds(node: AgencyNode): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child));
  }
  return ids;
}

function collectAllAncestorIds(agencyId: string, agencies: CrmAgency[]): string[] {
  const ids: string[] = [];
  let current = agencies.find(a => a.id === agencyId);
  while (current?.parent_agency_id) {
    ids.push(current.parent_agency_id);
    current = agencies.find(a => a.id === current!.parent_agency_id);
  }
  return ids;
}

export const Hierarchy: React.FC = () => {
  const [agencies, setAgencies] = useState<CrmAgency[]>([]);
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedAgency, setSelectedAgency] = useState<CrmAgency | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgencyNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingIntakes, setPendingIntakes] = useState<AgencyIntakeSubmission[]>([]);
  const [processingIntakeId, setProcessingIntakeId] = useState<string | null>(null);
  const [intakeError, setIntakeError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [agencyRes, rosterRes, intakeRes] = await Promise.all([
      supabase.from('hierarchy_agencies').select('*').order('name'),
      supabase.from('crm_roster_uploads').select('agency, row_count').order('uploaded_at', { ascending: false }),
      supabase.from('agency_intake_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);

    setPendingIntakes((intakeRes.data as AgencyIntakeSubmission[]) || []);

    const allAgencies = (agencyRes.data || []).filter(a => !a.is_test);
    setAgencies(allAgencies);

    const counts: Record<string, number> = {};
    for (const upload of (rosterRes.data || [])) {
      if (!counts[upload.agency]) {
        counts[upload.agency] = upload.row_count || 0;
      }
    }
    setAgentCounts(counts);

    const allIds = allAgencies.map(a => a.id);
    setExpandedNodes(new Set(allIds));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tree = React.useMemo(() => buildRecursiveTree(agencies, agentCounts), [agencies, agentCounts]);

  const filteredTree = (): AgencyNode[] => {
    if (!search.trim()) return tree;
    const term = search.toLowerCase();
    const matchingIds = new Set(
      agencies.filter(a => a.name.toLowerCase().includes(term)).map(a => a.id)
    );
    const ancestorIds = new Set<string>();
    for (const id of matchingIds) {
      for (const aid of collectAllAncestorIds(id, agencies)) {
        ancestorIds.add(aid);
      }
    }
    const visibleIds = new Set([...matchingIds, ...ancestorIds]);
    const filterNodes = (nodes: AgencyNode[]): AgencyNode[] =>
      nodes
        .filter(n => isNodeVisible(n, visibleIds))
        .map(n => ({ ...n, children: filterNodes(n.children) }));
    return filterNodes(tree);
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

  const ensureSession = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const serviceEmail = import.meta.env.VITE_SERVICE_EMAIL;
      const servicePassword = import.meta.env.VITE_SERVICE_PASSWORD;
      if (serviceEmail && servicePassword) {
        await supabase.auth.signInWithPassword({ email: serviceEmail, password: servicePassword });
      }
    }
  };

  const handleAddAgency = async (name: string, parentId: string, contracting: {
    agency_npn: string;
    agency_ein: string;
    principal_agent: string;
    principal_agent_npn: string;
    contracting_email: string;
    contracting_contact: string;
  }) => {
    await ensureSession();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const portalPassword = `${name}CRMPortal!`;

    const { data, error } = await supabase
      .from('hierarchy_agencies')
      .insert({
        name,
        agency_type: 'sub',
        parent_agency_id: parentId,
        onboarding_status: 'pending_csr_assignment',
        is_active: true,
        crm_enabled: false,
        slug,
        portal_password: portalPassword,
        date_created: new Date().toISOString().slice(0, 10),
        agency_npn: contracting.agency_npn.trim() || null,
        agency_ein: contracting.agency_ein.trim() || null,
        principal_agent: contracting.principal_agent.trim() || null,
        principal_agent_npn: contracting.principal_agent_npn.trim() || null,
        contracting_email: contracting.contracting_email.trim() || null,
        contracting_contact: contracting.contracting_contact.trim() || null,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setAgencies(prev => [...prev, data]);
      setExpandedNodes(prev => new Set([...prev, data.id, parentId]));
      setShowAddModal(false);
    }
    return error?.message || null;
  };

  const handleApproveIntake = async (submission: AgencyIntakeSubmission) => {
    setProcessingIntakeId(submission.id);
    setIntakeError('');
    await ensureSession();

    const name = submission.agency_name.trim();
    const parentId = submission.parent_agency_id;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const portalPassword = `${name}CRMPortal!`;

    // Upsert on slug: if the agency was pre-seeded from the rolodex, intake data wins
    // and overwrites the stub fields (NPN, EIN, principal agent, emails, etc.).
    const { data, error } = await supabase
      .from('hierarchy_agencies')
      .upsert({
        name,
        agency_type: parentId ? 'sub' : 'main',
        parent_agency_id: parentId,
        onboarding_status: 'pending_csr_assignment',
        is_active: true,
        crm_enabled: false,
        slug,
        portal_password: portalPassword,
        date_created: new Date().toISOString().slice(0, 10),
        agency_npn: submission.agency_npn?.trim() || null,
        agency_ein: submission.agency_ein?.trim() || null,
        principal_agent: submission.principal_agent?.trim() || null,
        principal_agent_npn: submission.principal_agent_npn?.trim() || null,
        contracting_email: submission.contracting_email?.trim() || null,
        contracting_contact: submission.contracting_contact?.trim() || null,
      }, { onConflict: 'slug' })
      .select()
      .maybeSingle();

    if (error || !data) {
      setIntakeError(error?.message || 'Failed to create agency from intake.');
      setProcessingIntakeId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('agency_intake_submissions')
      .update({ status: 'approved', approved_agency_id: data.id, reviewed_at: new Date().toISOString() })
      .eq('id', submission.id);

    if (updateError) {
      // Agency was created; surface the status-sync issue but don't leave it in the tray twice.
      setIntakeError(`Agency created, but marking the intake approved failed: ${updateError.message}`);
    }

    setAgencies(prev => [...prev, data]);
    setExpandedNodes(prev => new Set(parentId ? [...prev, data.id, parentId] : [...prev, data.id]));
    setPendingIntakes(prev => prev.filter(s => s.id !== submission.id));
    setProcessingIntakeId(null);
  };

  const handleRejectIntake = async (submission: AgencyIntakeSubmission) => {
    setProcessingIntakeId(submission.id);
    setIntakeError('');
    await ensureSession();
    const { error } = await supabase
      .from('agency_intake_submissions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', submission.id);
    if (error) {
      setIntakeError(`Failed to reject intake: ${error.message}`);
    } else {
      setPendingIntakes(prev => prev.filter(s => s.id !== submission.id));
    }
    setProcessingIntakeId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await ensureSession();
    const { error } = await supabase
      .from('hierarchy_agencies')
      .delete()
      .eq('id', deleteTarget.id);

    if (!error) {
      const removedIds = new Set([deleteTarget.id, ...getDescendantIds(deleteTarget)]);
      setAgencies(prev => prev.filter(a => !removedIds.has(a.id)));
      if (selectedAgency && removedIds.has(selectedAgency.id)) {
        setSelectedAgency(null);
      }
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-600" />
      </div>
    );
  }

  const displayTree = filteredTree();

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

      {pendingIntakes.length > 0 && (
        <PendingIntakeTray
          submissions={pendingIntakes}
          processingId={processingIntakeId}
          error={intakeError}
          onApprove={handleApproveIntake}
          onReject={handleRejectIntake}
        />
      )}

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
        {displayTree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expandedNodes={expandedNodes}
            onToggle={toggleExpand}
            onSelect={setSelectedAgency}
            onDelete={setDeleteTarget}
          />
        ))}
        {displayTree.length === 0 && (
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

      {deleteTarget && (
        <DeleteConfirmModal
          node={deleteTarget}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
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
  onDelete: (node: AgencyNode) => void;
}> = ({ node, depth, expandedNodes, onToggle, onSelect, onDelete }) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isRoot = node.agency_type === 'main';
  const isFym = node.name.toLowerCase() === 'fym';
  const isContractingIncomplete = !isFym && !isRoot && (
    !node.agency_npn?.trim() ||
    !node.agency_ein?.trim() ||
    !node.principal_agent?.trim() ||
    !node.principal_agent_npn?.trim() ||
    !node.contracting_email?.trim()
  );

  const depthColors = [
    'bg-navy-100 text-navy-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-sky-100 text-sky-700',
    'bg-rose-100 text-rose-700',
  ];

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
          node.crm_enabled
            ? 'bg-white border-steel-200 hover:border-navy-300'
            : 'bg-steel-50 border-steel-200 hover:border-steel-300'
        }`}
        style={{ marginLeft: depth * 24 }}
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
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${depthColors[depth % depthColors.length]}`}>
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
              {isContractingIncomplete && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wider">
                  Incomplete
                </span>
              )}
              {(node.carriers || []).map(c => (
                <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                  {c}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-steel-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {node.agentCount} agent{node.agentCount !== 1 ? 's' : ''}
              </span>
              {isRoot && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-navy-50 text-navy-600">
                  Root
                </span>
              )}
            </div>
          </div>
        </div>

        {!isRoot && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="p-1.5 rounded-md text-steel-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete agency"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 relative">
          <div
            className="absolute top-0 bottom-0 border-l-2 border-steel-200 rounded-bl"
            style={{ left: depth * 24 + 20 }}
          />
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DeleteConfirmModal: React.FC<{
  node: AgencyNode;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ node, deleting, onConfirm, onCancel }) => {
  const descendantCount = getDescendantIds(node).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-steel-900">Delete Agency</h3>
            <p className="text-sm text-steel-600 mt-1">
              Are you sure you want to delete <strong>{node.name}</strong>?
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
          <p className="text-red-800 font-medium">This action cannot be undone.</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
            {descendantCount > 0 && (
              <li>{descendantCount} child agenc{descendantCount === 1 ? 'y' : 'ies'} will also be deleted</li>
            )}
            {node.crm_enabled && <li>This agency is CRM-enabled and will be removed from CRM Team</li>}
            <li>All associated deals, GHL configs, KPIs, and tickets will be removed</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-steel-700 border border-steel-300 rounded-lg hover:bg-steel-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Agency'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingIntakeTray: React.FC<{
  submissions: AgencyIntakeSubmission[];
  processingId: string | null;
  error: string;
  onApprove: (submission: AgencyIntakeSubmission) => void;
  onReject: (submission: AgencyIntakeSubmission) => void;
}> = ({ submissions, processingId, error, onApprove, onReject }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Inbox className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-steel-900">
              Pending Intake
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-800">
                {submissions.length}
              </span>
            </p>
            <p className="text-xs text-steel-500">Submitted via the public agency intake link — review to create the agency.</p>
          </div>
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-steel-400" /> : <ChevronDown className="w-4 h-4 text-steel-400" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {submissions.map((s) => {
            const busy = processingId === s.id;
            return (
              <div key={s.id} className="bg-white rounded-lg border border-steel-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-steel-900 text-sm truncate">{s.agency_name}</p>
                    <p className="text-xs text-steel-500">
                      {s.parent_agency_name ? `Parent: ${s.parent_agency_name}` : 'No parent (main agency)'}
                      {' · '}
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onReject(s)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-steel-600 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => onApprove(s)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {busy ? 'Working...' : 'Approve'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <IntakeField label="Agency NPN" value={s.agency_npn} />
                  <IntakeField label="Agency EIN" value={s.agency_ein} />
                  <IntakeField label="Principal Agent" value={s.principal_agent} />
                  <IntakeField label="Principal Agent NPN" value={s.principal_agent_npn} />
                  <IntakeField label="Contracting Email" value={s.contracting_email} />
                  <IntakeField label="Contracting Contact" value={s.contracting_contact || '—'} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const IntakeField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-steel-400">{label}:</span>
    <span className="font-medium text-steel-700 truncate">{value}</span>
  </div>
);

const AddAgencyHierarchyModal: React.FC<{
  agencies: CrmAgency[];
  onClose: () => void;
  onAdd: (name: string, parentId: string, contracting: {
    agency_npn: string;
    agency_ein: string;
    principal_agent: string;
    principal_agent_npn: string;
    contracting_email: string;
    contracting_contact: string;
  }) => Promise<string | null>;
}> = ({ agencies, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [agencyNpn, setAgencyNpn] = useState('');
  const [agencyEin, setAgencyEin] = useState('');
  const [principalAgent, setPrincipalAgent] = useState('');
  const [principalAgentNpn, setPrincipalAgentNpn] = useState('');
  const [contractingEmail, setContractingEmail] = useState('');
  const [contractingContact, setContractingContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const rootAgency = agencies.find(a => a.agency_type === 'main');

  useEffect(() => {
    if (rootAgency && !parentId) {
      setParentId(rootAgency.id);
    }
  }, [rootAgency, parentId]);

  const buildFlatList = (): { agency: CrmAgency; indent: number }[] => {
    const result: { agency: CrmAgency; indent: number }[] = [];
    const addNode = (id: string, depth: number) => {
      const a = agencies.find(ag => ag.id === id);
      if (!a) return;
      result.push({ agency: a, indent: depth });
      const children = agencies.filter(ag => ag.parent_agency_id === id).sort((x, y) => x.name.localeCompare(y.name));
      for (const child of children) {
        addNode(child.id, depth + 1);
      }
    };
    if (rootAgency) addNode(rootAgency.id, 0);
    return result;
  };

  const flatList = buildFlatList();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Agency name is required.'); return; }
    if (!parentId) { setError('Select a parent agency.'); return; }
    if (!agencyNpn.trim()) { setError('Agency NPN is required.'); return; }
    if (!agencyEin.trim()) { setError('Agency EIN is required.'); return; }
    if (!principalAgent.trim()) { setError('Principal Agent name is required.'); return; }
    if (!principalAgentNpn.trim()) { setError('Principal Agent NPN is required.'); return; }
    if (!contractingEmail.trim()) { setError('Contracting email is required.'); return; }
    if (!emailRegex.test(contractingEmail.trim())) { setError('Please enter a valid email address.'); return; }

    setSubmitting(true);
    setError('');
    const err = await onAdd(name.trim(), parentId, {
      agency_npn: agencyNpn,
      agency_ein: agencyEin,
      principal_agent: principalAgent,
      principal_agent_npn: principalAgentNpn,
      contracting_email: contractingEmail,
      contracting_contact: contractingContact,
    });
    if (err) {
      setError(err.includes('23505') ? 'An agency with this name already exists.' : err);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 flex-shrink-0">
          <h3 className="font-semibold text-steel-900">Add New Agency</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-steel-100 rounded-lg">
            <X className="w-5 h-5 text-steel-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="New agency name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-1">Parent Agency</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              {flatList.map(({ agency, indent }) => (
                <option key={agency.id} value={agency.id}>
                  {'  '.repeat(indent)}{indent > 0 ? '-- ' : ''}{agency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-steel-200 pt-4">
            <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-3">Contracting Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Agency NPN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={agencyNpn}
                  onChange={(e) => { setAgencyNpn(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 12345678"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Agency EIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={agencyEin}
                  onChange={(e) => { setAgencyEin(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 12-3456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Principal Agent <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={principalAgent}
                  onChange={(e) => { setPrincipalAgent(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Principal Agent NPN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={principalAgentNpn}
                  onChange={(e) => { setPrincipalAgentNpn(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="e.g. 87654321"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Contracting Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contractingEmail}
                  onChange={(e) => { setContractingEmail(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-700 mb-1">
                  Contracting Contact
                </label>
                <input
                  type="text"
                  value={contractingContact}
                  onChange={(e) => { setContractingContact(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  placeholder="If applicable"
                />
              </div>
            </div>
          </div>

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