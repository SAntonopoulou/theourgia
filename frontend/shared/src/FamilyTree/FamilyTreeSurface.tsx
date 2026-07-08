/**
 * FamilyTreeSurface — SVG viz for the kinship graph of an entity.
 *
 * Per FEATURES.md §3 ("lightweight family tree visualisation — no
 * integration with genealogy services for privacy"). The tree
 * lays out generations as horizontal rows; the probe entity is
 * centred and highlighted; parents/grandparents sit above; children/
 * grandchildren sit below; siblings and spouses share the row.
 *
 * The design system tokens carry all colour and typography — no
 * raw hex.
 */

import { type CSSProperties, useMemo } from "react";

import {
  type FamilyEdgeKind,
  type FamilyTreeInput,
  layoutFamilyTree,
} from "./layout.js";

export interface FamilyTreeSurfaceProps {
  tree: FamilyTreeInput;
  /** Optional handler — fires when the user clicks a non-probe node. */
  onSelectNode?: (nodeId: string) => void;
  /** Optional handler — fires when the user clicks an edge. */
  onRemoveEdge?: (edgeId: string) => void;
  className?: string;
  style?: CSSProperties;
}

const EDGE_STYLES: Record<
  FamilyEdgeKind,
  { stroke: string; dashArray: string; label: string; directed: boolean }
> = {
  "parent-of": {
    stroke: "var(--edge)",
    dashArray: "0",
    label: "child of",
    directed: true,
  },
  "sibling-of": {
    stroke: "var(--edge)",
    dashArray: "4 3",
    label: "sibling",
    directed: false,
  },
  "spouse-of": {
    stroke: "var(--accent)",
    dashArray: "0",
    label: "spouse",
    directed: false,
  },
};

export function FamilyTreeSurface({
  tree,
  onSelectNode,
  onRemoveEdge,
  className,
  style,
}: FamilyTreeSurfaceProps) {
  const laidOut = useMemo(() => layoutFamilyTree(tree), [tree]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${laidOut.width} ${laidOut.height}`}
      width="100%"
      style={{
        maxWidth: "100%",
        height: "auto",
        display: "block",
        ...style,
      }}
      role="img"
      aria-label="Family tree"
      data-component="family-tree"
      data-probe-id={tree.probe_id}
    >
      {laidOut.edges.map((edge) => {
        const meta = EDGE_STYLES[edge.kind];
        const midX = (edge.fromX + edge.toX) / 2;
        const midY = (edge.fromY + edge.toY) / 2;
        return (
          <g key={edge.id} data-edge-id={edge.id} data-edge-kind={edge.kind}>
            <line
              x1={edge.fromX}
              y1={edge.fromY}
              x2={edge.toX}
              y2={edge.toY}
              stroke={meta.stroke}
              strokeWidth={1.4}
              strokeDasharray={meta.dashArray}
              opacity={0.65}
            />
            {meta.directed && (
              <polygon
                points={`${edge.toX - 5},${edge.toY - 8} ${edge.toX + 5},${
                  edge.toY - 8
                } ${edge.toX},${edge.toY - 1}`}
                fill={meta.stroke}
                opacity={0.7}
              />
            )}
            <text
              x={midX}
              y={midY - 6}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fill: "var(--edge)",
                cursor: onRemoveEdge ? "pointer" : "default",
              }}
              onClick={
                onRemoveEdge ? () => onRemoveEdge(edge.id) : undefined
              }
            >
              {meta.label}
            </text>
          </g>
        );
      })}

      {laidOut.nodes.map((node) => {
        const isProbe = node.id === tree.probe_id;
        return (
          <g
            key={node.id}
            data-node-id={node.id}
            data-node-role={isProbe ? "probe" : "kin"}
            data-node-kind={node.kind}
            style={{
              cursor: !isProbe && onSelectNode ? "pointer" : "default",
            }}
            onClick={
              !isProbe && onSelectNode ? () => onSelectNode(node.id) : undefined
            }
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={isProbe ? 26 : 21}
              fill="var(--bg-2)"
              stroke={isProbe ? "var(--accent)" : "var(--line-2)"}
              strokeWidth={isProbe ? 2 : 1.2}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: isProbe ? 18 : 15,
                fill: "var(--c-entity)",
              }}
            >
              {node.name.charAt(0).toUpperCase()}
            </text>
            <text
              x={node.x}
              y={node.y + (isProbe ? 42 : 36)}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                fill: "var(--ink)",
              }}
            >
              {node.name}
            </text>
            {typeof node.ancestor_profile?.dates_lived_from === "string" ||
            typeof node.ancestor_profile?.dates_lived_until === "string" ? (
              <text
                x={node.x}
                y={node.y + (isProbe ? 56 : 50)}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  fill: "var(--muted)",
                }}
              >
                {String(node.ancestor_profile?.dates_lived_from ?? "?")}—
                {String(node.ancestor_profile?.dates_lived_until ?? "?")}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
