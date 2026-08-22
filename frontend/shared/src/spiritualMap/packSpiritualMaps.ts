/**
 * Read a `spiritual-map` pack payload into drawable figures.
 *
 * Coordinates come from the pack and only the pack — a triangular lattice
 * of ten and a Tree of three pillars have no layout in common, and a
 * renderer that guessed would draw one of them wrong. What the figure
 * needs to be DRAWN is here; the deeper lore a node carries (sections,
 * epithets, correspondences) stays in the pack for the node sheet.
 */

export interface PackMapNode {
  id: string;
  name: string;
  /** Its number where the tradition numbers its positions; null where it
   *  names them instead. */
  number: number | null;
  summary: string;
  grade: string;
  x: number;
  y: number;
}

export interface PackMapEdge {
  from: string;
  to: string;
}

/** A global line spans the figure; it is NOT a step between neighbours,
 *  and is drawn beneath the edges, wider and fainter, so nobody takes a
 *  horizon for an ascent-step. */
export interface PackMapLine {
  nodeIds: string[];
}

export interface PackSpiritualMap {
  id: string;
  name: string;
  tradition: string;
  summary: string;
  nodes: PackMapNode[];
  edges: PackMapEdge[];
  lines: PackMapLine[];
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function packToSpiritualMaps(payload: unknown): PackSpiritualMap[] {
  const maps = (payload as { maps?: unknown })?.maps;
  if (!Array.isArray(maps)) return [];
  const out: PackSpiritualMap[] = [];
  for (const raw of maps) {
    if (raw === null || typeof raw !== "object") continue;
    const doc = raw as Record<string, unknown>;
    const name = typeof doc.name === "string" ? doc.name : "";
    if (!name) continue;
    const nodes: PackMapNode[] = [];
    for (const rawNode of Array.isArray(doc.nodes) ? doc.nodes : []) {
      if (rawNode === null || typeof rawNode !== "object") continue;
      const node = rawNode as Record<string, unknown>;
      if (typeof node.id !== "string" || !node.id) continue;
      if (typeof node.name !== "string" || !node.name) continue;
      nodes.push({
        id: node.id,
        name: node.name,
        number: typeof node.number === "number" ? node.number : null,
        summary: typeof node.summary === "string" ? node.summary : "",
        grade: typeof node.grade === "string" ? node.grade : "",
        x: typeof node.x === "number" ? node.x : 0,
        y: typeof node.y === "number" ? node.y : 0,
      });
    }
    if (nodes.length === 0) continue;
    const held = new Set(nodes.map((n) => n.id));
    const edges: PackMapEdge[] = [];
    for (const rawEdge of Array.isArray(doc.edges) ? doc.edges : []) {
      if (rawEdge === null || typeof rawEdge !== "object") continue;
      const edge = rawEdge as Record<string, unknown>;
      if (typeof edge.from !== "string" || typeof edge.to !== "string") continue;
      if (!held.has(edge.from) || !held.has(edge.to)) continue;
      edges.push({ from: edge.from, to: edge.to });
    }
    const lines: PackMapLine[] = [];
    for (const rawLine of Array.isArray(doc.lines) ? doc.lines : []) {
      if (rawLine === null || typeof rawLine !== "object") continue;
      const ids = strings((rawLine as Record<string, unknown>).nodes).filter((id) =>
        held.has(id),
      );
      if (ids.length >= 2) lines.push({ nodeIds: ids });
    }
    out.push({
      id: typeof doc.id === "string" && doc.id ? doc.id : name.toLowerCase().replace(/\s+/g, "-"),
      name,
      tradition: typeof doc.tradition === "string" ? doc.tradition : "",
      summary: typeof doc.summary === "string" ? doc.summary : "",
      nodes,
      edges,
      lines,
    });
  }
  return out;
}
