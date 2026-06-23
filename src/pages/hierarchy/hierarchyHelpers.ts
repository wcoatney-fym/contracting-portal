import type { CrmAgency } from '../../lib/supabase';

export interface TreeNode {
  agency: CrmAgency;
  children: TreeNode[];
}

export function buildTree(agencies: CrmAgency[]): TreeNode[] {
  const byId = new Map<string, CrmAgency>();
  for (const a of agencies) byId.set(a.id, a);

  const childrenMap = new Map<string, CrmAgency[]>();
  const roots: CrmAgency[] = [];

  for (const a of agencies) {
    if (a.parent_agency_id && byId.has(a.parent_agency_id)) {
      const siblings = childrenMap.get(a.parent_agency_id) || [];
      siblings.push(a);
      childrenMap.set(a.parent_agency_id, siblings);
    } else {
      roots.push(a);
    }
  }

  function toNode(agency: CrmAgency): TreeNode {
    const children = (childrenMap.get(agency.id) || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toNode);
    return { agency, children };
  }

  return roots.sort((a, b) => a.name.localeCompare(b.name)).map(toNode);
}

export function getAncestorPath(agency: CrmAgency, allAgencies: CrmAgency[]): CrmAgency[] {
  const byId = new Map<string, CrmAgency>();
  for (const a of allAgencies) byId.set(a.id, a);

  const path: CrmAgency[] = [];
  let current: CrmAgency | undefined = agency;

  while (current) {
    path.unshift(current);
    current = current.parent_agency_id ? byId.get(current.parent_agency_id) : undefined;
  }

  return path;
}

export function flattenTreeIndented(agencies: CrmAgency[]): { agency: CrmAgency; depth: number }[] {
  const tree = buildTree(agencies);
  const result: { agency: CrmAgency; depth: number }[] = [];

  function walk(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      result.push({ agency: node.agency, depth });
      walk(node.children, depth + 1);
    }
  }

  walk(tree, 0);
  return result;
}
