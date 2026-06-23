/**
 * SquareView — the SVG grid for the active magic square.
 *
 * Three modes:
 *   · view  — cells render values + Hebrew gematria overlay; the
 *             traditional planetary sigil (numeric path 1..n²)
 *             overlays at 55% opacity. Click selects a cell.
 *   · trace — cells are clickable; each click appends to a polyline
 *             traced through the cell centres in click order.
 *   · build — cells become editable text inputs; for custom squares
 *             only.
 */

import * as React from "react";
import { type CSSProperties } from "react";

import { hebNum } from "../workshop/index.js";

import { type MagicSquareMode } from "./copy.js";

export interface SquareViewProps {
  cells: readonly (readonly number[])[] | null;
  /** Order — used for empty/Build grids. */
  order: number;
  mode: MagicSquareMode;
  /** Indices of cells traced so far (row-major: r*n + c). */
  trace?: readonly number[];
  /** Selected cell index (View mode). */
  selected?: number | null;
  onSelectCell?: (index: number) => void;
  onAppendTrace?: (index: number) => void;
  onEditCell?: (index: number, value: string) => void;
  className?: string;
  style?: CSSProperties;
}

const TRACE_OVERLAY_OPACITY = 0.55;

export function SquareView({
  cells,
  order,
  mode,
  trace = [],
  selected = null,
  onSelectCell,
  onAppendTrace,
  onEditCell,
  className,
  style,
}: SquareViewProps) {
  const n = cells ? cells.length : order;
  const cellSize = Math.min(58, Math.floor(420 / n));
  const W = n * cellSize;

  const pos = (idx: number) => ({
    r: Math.floor(idx / n),
    c: idx % n,
  });

  const cellNodes: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const idx = r * n + c;
      const val = cells ? cells[r]![c]! : 0;
      const dark = (r + c) % 2 === 0;
      const onClick =
        mode === "trace" && cells
          ? () => onAppendTrace?.(idx)
          : mode === "view" && cells
            ? () => onSelectCell?.(idx)
            : undefined;
      cellNodes.push(
        <g
          key={idx}
          data-cell-index={idx}
          {...(onClick ? { onClick } : {})}
          style={{ cursor: onClick ? "pointer" : "default" }}
        >
          <rect
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill={dark ? "var(--bg-2)" : "var(--bg)"}
            stroke="var(--line)"
            strokeWidth={1}
          />
          {mode === "build" && !cells ? (
            <foreignObject
              x={c * cellSize + 3}
              y={r * cellSize + 3}
              width={cellSize - 6}
              height={cellSize - 6}
            >
              <input
                type="text"
                defaultValue=""
                data-build-cell-index={idx}
                aria-label={`Cell ${idx + 1}`}
                onChange={(e) => onEditCell?.(idx, e.target.value)}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: cellSize * 0.34,
                  textAlign: "center",
                }}
              />
            </foreignObject>
          ) : cells ? (
            <>
              <text
                x={c * cellSize + cellSize / 2}
                y={r * cellSize + cellSize / 2 + cellSize * 0.13}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={cellSize * 0.32}
                fill={selected === idx ? "var(--accent)" : "var(--ink)"}
              >
                {val}
              </text>
              <text
                x={c * cellSize + cellSize - 4}
                y={r * cellSize + 13}
                textAnchor="end"
                fontFamily="var(--font-hebrew)"
                fontSize={cellSize * 0.2}
                fill="var(--ink-mute)"
              >
                {hebNum(val)}
              </text>
              <title>{`${val} · ${hebNum(val)}`}</title>
            </>
          ) : null}
        </g>,
      );
    }
  }

  // Planet sigil overlay (numeric path through 1..n²) in View mode.
  let overlay: React.ReactNode = null;
  if (cells && mode === "view") {
    const findCentre = (target: number): [number, number] | null => {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (cells[r]![c] === target) {
            return [
              c * cellSize + cellSize / 2,
              r * cellSize + cellSize / 2,
            ];
          }
        }
      }
      return null;
    };
    let d = "";
    for (let v = 1; v <= n * n; v++) {
      const p = findCentre(v);
      if (!p) continue;
      d += `${v === 1 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
    }
    const start = findCentre(1);
    overlay = (
      <g
        data-planet-overlay
        opacity={TRACE_OVERLAY_OPACITY}
        style={{ pointerEvents: "none" }}
      >
        <path
          d={d.trimEnd()}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {start ? (
          <circle cx={start[0]} cy={start[1]} r={4} fill="var(--accent)" />
        ) : null}
      </g>
    );
  }

  // User trace polyline.
  let traceEl: React.ReactNode = null;
  if (cells && mode === "trace" && trace.length > 0) {
    let d = "";
    for (let i = 0; i < trace.length; i++) {
      const p = pos(trace[i]!);
      const x = p.c * cellSize + cellSize / 2;
      const y = p.r * cellSize + cellSize / 2;
      d += `${i === 0 ? "M" : "L"}${x} ${y} `;
    }
    traceEl = (
      <g data-user-trace style={{ pointerEvents: "none" }}>
        <path
          d={d.trimEnd()}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {trace.map((idx, i) => {
          const p = pos(idx);
          return (
            <circle
              key={i}
              cx={p.c * cellSize + cellSize / 2}
              cy={p.r * cellSize + cellSize / 2}
              r={4}
              fill="var(--accent)"
            />
          );
        })}
      </g>
    );
  }

  return (
    <svg
      data-component="magic-square-view"
      data-mode={mode}
      data-order={n}
      viewBox={`0 0 ${W} ${W}`}
      width={W}
      height={W}
      role="img"
      aria-label="Magic square"
      className={className}
      style={{ maxWidth: "100%", height: "auto", ...style }}
    >
      {cellNodes}
      {overlay}
      {traceEl}
    </svg>
  );
}
