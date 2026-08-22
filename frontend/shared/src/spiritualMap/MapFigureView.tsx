/**
 * MapFigureView — the figure, drawn and clickable. The web port of the
 * phone's MapFigure.
 *
 * Coordinates come from the pack and are scaled into the box WITH the
 * aspect kept — not a nicety: the tetraktys is equilateral and the shapes
 * read off it (the nine unit triangles, the hexagon around the hub) are
 * only true if it is not stretched. A figure squeezed to fill would be a
 * different figure.
 *
 * The lines are drawn UNDER the edges: a global line spans the figure and
 * is where the luminaries ride; an edge is one step between neighbours.
 * Drawing lines beneath, wider and fainter, keeps the distinction visible
 * — on the tetraktys the base is a line and NOT an edge, and a diagram
 * that showed both the same way would pass the horizon off as an
 * ascent-step.
 */

import type { CSSProperties } from "react";

import type { PackSpiritualMap } from "./packSpiritualMaps.js";

/** A node circle's diameter, in the figure's drawn pixels. */
const DIAMETER = 54;

export interface MapFigureViewProps {
  map: PackSpiritualMap;
  /** Node ids to pick out — an edge with both ends chosen is drawn as part
   *  of what has been picked out, so neighbours never look like unrelated
   *  dots. */
  chosen?: ReadonlySet<string>;
  onNodeClick?: (nodeId: string) => void;
  /** Drawn width in CSS pixels; height follows the figure's own aspect. */
  width?: number;
  style?: CSSProperties;
}

/** Scale the pack's own coordinates into a width × height box, keeping the
 *  aspect. Exported for tests. */
export function placeNodes(
  nodes: { id: string; x: number; y: number }[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const placed = new Map<string, { x: number; y: number }>();
  const first = nodes[0];
  if (!first || width <= 0 || height <= 0) return placed;
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const inset = DIAMETER / 2 + 4;
  const usableW = width - inset * 2;
  const usableH = height - inset * 2;
  if (usableW <= 0 || usableH <= 0) return placed;
  // A map that is all one row, or all one column, has no span on that
  // axis and must not divide by it.
  const candidates = [
    ...(spanX > 0 ? [usableW / spanX] : []),
    ...(spanY > 0 ? [usableH / spanY] : []),
  ];
  const scale = candidates.length > 0 ? Math.min(...candidates) : 1;
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = inset + (usableW - drawnW) / 2;
  const offsetY = inset + (usableH - drawnH) / 2;
  for (const node of nodes) {
    placed.set(node.id, {
      x: offsetX + (node.x - minX) * scale,
      y: offsetY + (node.y - minY) * scale,
    });
  }
  return placed;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const firstWord = words[0];
  if (firstWord === undefined || firstWord === "") return "";
  if (words.length === 1) return firstWord.slice(0, 3);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("");
}

export function MapFigureView({
  map,
  chosen = new Set<string>(),
  onNodeClick,
  width = 420,
  style,
}: MapFigureViewProps) {
  // Height from the figure's own aspect, bounded so a tall Tree still
  // fits a screen.
  const xs = map.nodes.map((n) => n.x);
  const ys = map.nodes.map((n) => n.y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const height = Math.max(200, Math.min(640, (width - 58) * (spanY / spanX) + 58));
  const placed = placeNodes(map.nodes, width, height);

  return (
    <svg
      role="group"
      aria-label={map.name}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, display: "block", ...style }}
    >
      <title>{map.name}</title>
      {/* Global lines first, beneath everything: wide, faint, continuous
          through the positions they pass. */}
      {map.lines.map((line, lineIndex) => {
        const points = line.nodeIds
          .map((id) => placed.get(id))
          .filter((p): p is { x: number; y: number } => p !== undefined);
        return points.slice(0, -1).map((from, i) => {
          const to = points[i + 1];
          if (!to) return null;
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: a line's segments are a fixed ordered list
              key={`line-${lineIndex}-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--accent)"
              strokeOpacity={0.16}
              strokeWidth={7}
              strokeLinecap="round"
            />
          );
        });
      })}
      {map.edges.map((edge) => {
        const from = placed.get(edge.from);
        const to = placed.get(edge.to);
        if (!from || !to) return null;
        const within = chosen.has(edge.from) && chosen.has(edge.to);
        return (
          <line
            key={`edge-${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={within ? "var(--accent)" : "var(--line-2, var(--line))"}
            strokeOpacity={within ? 0.8 : 0.75}
            strokeWidth={within ? 2.2 : 1.2}
          />
        );
      })}
      {map.nodes.map((node) => {
        const centre = placed.get(node.id);
        if (!centre) return null;
        const isChosen = chosen.has(node.id);
        return (
          // biome-ignore lint/a11y/useSemanticElements: a <button> cannot live inside <svg>; role=button on the group is the accessible form
          <g
            key={node.id}
            role="button"
            aria-label={node.name}
            aria-pressed={isChosen}
            tabIndex={onNodeClick ? 0 : -1}
            onClick={() => onNodeClick?.(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onNodeClick?.(node.id);
              }
            }}
            style={{ cursor: onNodeClick ? "pointer" : "default" }}
          >
            <circle
              cx={centre.x}
              cy={centre.y}
              r={DIAMETER / 2}
              fill={isChosen ? "var(--accent-soft, var(--bg-2))" : "var(--bg-2)"}
              stroke={isChosen ? "var(--accent)" : "var(--line-2, var(--line))"}
              strokeWidth={isChosen ? 2 : 1}
            />
            <text
              x={centre.x}
              y={centre.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isChosen ? "var(--accent)" : "var(--ink-soft)"}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: node.number == null ? 11 : 16,
                userSelect: "none",
              }}
            >
              {node.number?.toString() ?? initials(node.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
