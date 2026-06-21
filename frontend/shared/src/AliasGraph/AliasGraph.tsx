/**
 * AliasGraph — node-edge diagram for an entity aggregate.
 *
 * Per `Theourgia Aliases.dc.html`. The focus entity sits at top
 * center; every entity connected to it via any edge lays out in rows
 * of up to three below. Edges carry a typed label and an arrow:
 *   - asymmetric kinds (aspect-of · aspect-includes · epithet-of) → "→"
 *   - symmetric kinds (same-as · syncretic-with)                  → "↔"
 *
 * The primitive renders only the SVG diagram. The edge list, add
 * dialog, and saved-view rail belong to the composing surface (B73).
 */

import { type CSSProperties, useMemo } from "react";

export type AliasEdgeKind =
  | "same-as"
  | "aspect-of"
  | "aspect-includes"
  | "syncretic-with"
  | "epithet-of";

export interface AliasEdgeKindMeta {
  label: string;
  symmetric: boolean;
  description: string;
}

export const ALIAS_EDGE_KINDS: Record<AliasEdgeKind, AliasEdgeKindMeta> = {
  "same-as": {
    label: "Same as",
    symmetric: true,
    description: "You consider these two entities identical.",
  },
  "aspect-of": {
    label: "Aspect of",
    symmetric: false,
    description: "This source is one aspect of the target.",
  },
  "aspect-includes": {
    label: "Includes aspect",
    symmetric: false,
    description: "This source includes the target as an aspect.",
  },
  "syncretic-with": {
    label: "Syncretic with",
    symmetric: true,
    description:
      "Related but distinct; spoken to as one in some rites.",
  },
  "epithet-of": {
    label: "Epithet of",
    symmetric: false,
    description: "This source is an epithet attached to the target.",
  },
};

export interface AliasNode {
  id: string;
  name: string;
  /** Per-tradition color override; defaults to var(--c-entity). */
  color?: string;
}

export interface AliasEdge {
  id: string;
  from: string;
  to: string;
  kind: AliasEdgeKind;
  note?: string;
}

export interface EntityAggregate {
  focusId: string;
  nodes: AliasNode[];
  edges: AliasEdge[];
}

export interface AliasGraphProps {
  aggregate: EntityAggregate;
  /** Optional click handler — fires with the edge id. */
  onRemoveEdge?: (edgeId: string) => void;
  className?: string;
  style?: CSSProperties;
}

interface Position {
  id: string;
  x: number;
  y: number;
}

function relatedIds(aggregate: EntityAggregate): string[] {
  const set: string[] = [aggregate.focusId];
  aggregate.edges.forEach((e) => {
    if (e.from === aggregate.focusId && !set.includes(e.to)) {
      set.push(e.to);
    }
    if (e.to === aggregate.focusId && !set.includes(e.from)) {
      set.push(e.from);
    }
  });
  return set;
}

function layout(others: string[], W: number, cy: number): Position[] {
  return others.map((id, i) => {
    const row = Math.floor(i / 3);
    const inRow = others.slice(row * 3, row * 3 + 3).length;
    const idx = i - row * 3;
    const spread = Math.min(W - 120, inRow * 200);
    const startX = W / 2 - spread / 2 + spread / (inRow * 2);
    const x = inRow === 1 ? W / 2 : startX + idx * (spread / inRow);
    const y = cy + 92 + row * 92;
    return { id, x, y };
  });
}

export function AliasGraph({
  aggregate,
  onRemoveEdge,
  className,
  style,
}: AliasGraphProps) {
  const W = 680;
  const cy = 58;
  const cx = W / 2;

  const nodesById = useMemo(() => {
    const m: Record<string, AliasNode> = {};
    aggregate.nodes.forEach((n) => {
      m[n.id] = n;
    });
    return m;
  }, [aggregate.nodes]);

  const members = useMemo(() => relatedIds(aggregate), [aggregate]);
  const others = members.filter((m) => m !== aggregate.focusId);
  const positions = useMemo(() => layout(others, W, cy), [others]);

  const H = Math.max(150, 90 + Math.ceil(Math.max(0, others.length) / 3) * 92);

  const focusNode = nodesById[aggregate.focusId];
  const focusName = focusNode?.name ?? aggregate.focusId;
  const focusColor = focusNode?.color ?? "var(--c-entity)";

  function findEdge(otherId: string): AliasEdge | undefined {
    return aggregate.edges.find(
      (e) =>
        (e.from === aggregate.focusId && e.to === otherId) ||
        (e.to === aggregate.focusId && e.from === otherId),
    );
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: "100%", height: "auto", display: "block", ...style }}
      role="img"
      aria-label={`Relationship diagram for ${focusName}`}
      data-component="alias-graph"
      data-focus-id={aggregate.focusId}
    >
      {positions.map((p) => {
        const e = findEdge(p.id);
        const meta = e ? ALIAS_EDGE_KINDS[e.kind] : undefined;
        const dbl = meta?.symmetric ?? false;
        const midX = (cx + p.x) / 2;
        const midY = (cy + p.y) / 2;
        return (
          <g key={`edge-${p.id}`} data-edge-id={e?.id}>
            <line
              x1={cx}
              y1={cy + (p.y > cy ? 22 : -22)}
              x2={p.x}
              y2={p.y - 21}
              stroke="var(--edge)"
              strokeWidth={1.3}
              opacity={0.6}
            />
            <text
              x={midX}
              y={midY}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fill: "var(--edge)",
                cursor: onRemoveEdge && e ? "pointer" : "default",
              }}
              onClick={
                onRemoveEdge && e ? () => onRemoveEdge(e.id) : undefined
              }
            >
              {(dbl ? "↔ " : "→ ") + (meta ? meta.label.toLowerCase() : "")}
            </text>
          </g>
        );
      })}

      {/* focus node — drawn last so it sits on top of edge lines */}
      <g data-node-id={aggregate.focusId} data-node-role="focus">
        <circle
          cx={cx}
          cy={cy}
          r={26}
          fill="var(--bg-2)"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fill: focusColor,
          }}
        >
          {focusName.charAt(0).toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 42}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fill: "var(--ink)",
          }}
        >
          {focusName}
        </text>
      </g>

      {positions.map((p) => {
        const node = nodesById[p.id];
        const name = node?.name ?? p.id;
        const col = node?.color ?? "var(--c-entity)";
        return (
          <g key={`node-${p.id}`} data-node-id={p.id} data-node-role="other">
            <circle
              cx={p.x}
              cy={p.y}
              r={21}
              fill="var(--bg-2)"
              stroke="var(--line-2)"
              strokeWidth={1.2}
            />
            <text
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fill: col,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </text>
            <text
              x={p.x}
              y={p.y + 36}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                fill: "var(--ink)",
              }}
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
