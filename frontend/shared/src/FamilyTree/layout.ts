/**
 * Family-tree layout — pure functions with no DOM dependencies.
 *
 * Nodes are placed on generational rows (Y axis) with siblings and
 * spouses sharing the row of their kinship counterpart. Within a
 * row, nodes are laid out in insertion order and centered around the
 * probe column.
 */

export type FamilyEdgeKind = "parent-of" | "sibling-of" | "spouse-of";

export interface FamilyTreeNodeInput {
  id: string;
  name: string;
  /** Kind from the backend enum — surfaces styling. */
  kind: string;
  /** Generation offset from the probe: 0 probe, negative up, positive down. */
  generation: number;
  ancestor_profile?: Record<string, unknown>;
}

export interface FamilyTreeEdgeInput {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  kind: FamilyEdgeKind;
}

export interface FamilyTreeInput {
  probe_id: string;
  nodes: FamilyTreeNodeInput[];
  edges: FamilyTreeEdgeInput[];
}

export interface LaidOutNode extends FamilyTreeNodeInput {
  x: number;
  y: number;
}

export interface LaidOutEdge extends FamilyTreeEdgeInput {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface LaidOutTree {
  width: number;
  height: number;
  probeX: number;
  probeY: number;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
}

export interface LayoutOptions {
  nodeSpacingX?: number;
  rowHeight?: number;
  padX?: number;
  padY?: number;
}

const DEFAULT_OPTS: Required<LayoutOptions> = {
  nodeSpacingX: 140,
  rowHeight: 130,
  padX: 40,
  padY: 40,
};

/**
 * Group nodes by generation, order deterministically within each
 * row (probe first, then by name), and compute x/y for each.
 *
 * Layout choices are intentionally minimal — the design brief calls
 * for "lightweight family tree visualisation", not a genealogy
 * package. If the tree gets bigger than the viewport, the surface
 * scrolls in its container.
 */
export function layoutFamilyTree(
  tree: FamilyTreeInput,
  options: LayoutOptions = {},
): LaidOutTree {
  const opts = { ...DEFAULT_OPTS, ...options };
  const byGeneration = new Map<number, FamilyTreeNodeInput[]>();
  for (const node of tree.nodes) {
    const row = byGeneration.get(node.generation) ?? [];
    row.push(node);
    byGeneration.set(node.generation, row);
  }
  // Order rows top→bottom by ascending generation (negative = up).
  const generations = Array.from(byGeneration.keys()).sort((a, b) => a - b);
  const orderedRows = generations.map((gen) => {
    const row = byGeneration.get(gen)!;
    row.sort((a, b) => {
      if (a.id === tree.probe_id) return -1;
      if (b.id === tree.probe_id) return 1;
      return a.name.localeCompare(b.name);
    });
    return { gen, nodes: row };
  });
  const maxRowSize = Math.max(1, ...orderedRows.map((r) => r.nodes.length));
  const width =
    opts.padX * 2 + (maxRowSize - 1) * opts.nodeSpacingX + opts.nodeSpacingX;
  const height =
    opts.padY * 2 + Math.max(0, orderedRows.length - 1) * opts.rowHeight + 60;

  const positioned = new Map<string, LaidOutNode>();
  orderedRows.forEach((row, rowIdx) => {
    const rowWidth = (row.nodes.length - 1) * opts.nodeSpacingX;
    const startX = width / 2 - rowWidth / 2;
    const y = opts.padY + rowIdx * opts.rowHeight + 30;
    row.nodes.forEach((node, colIdx) => {
      positioned.set(node.id, {
        ...node,
        x: startX + colIdx * opts.nodeSpacingX,
        y,
      });
    });
  });

  const probe = positioned.get(tree.probe_id);

  const laidOutEdges: LaidOutEdge[] = tree.edges.flatMap((edge) => {
    const from = positioned.get(edge.source_entity_id);
    const to = positioned.get(edge.target_entity_id);
    if (!from || !to) return [];
    return [
      {
        ...edge,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
      },
    ];
  });

  return {
    width,
    height,
    probeX: probe?.x ?? width / 2,
    probeY: probe?.y ?? opts.padY + 30,
    nodes: Array.from(positioned.values()),
    edges: laidOutEdges,
  };
}
