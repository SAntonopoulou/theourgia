/**
 * TetraktysFigure — the ten points in four rows, AS NAVIGATION.
 *
 * Per ``TetraktysLadder.dc.html``: the serpent path 10→9→8→7→4→5→6→
 * 3→2→1 renders dashed beneath the nodes; the current sphere is lit
 * (``--sphere-current``), walked spheres carry a check
 * (``--sphere-done``), locked spheres dim to 45% (``--sphere-locked``).
 * Every node is a keyboard-reachable button with an accessible name.
 */

import type { CSSProperties, KeyboardEvent } from "react";

import { _ } from "../i18n/index.js";
import { type SphereNumber, type SphereState, tetraktysLayout } from "../practice/tetraktys.js";

export interface TetraktysFigureSphere {
  number: SphereNumber;
  name: string;
  state: SphereState;
}

export interface TetraktysFigureProps {
  spheres: readonly TetraktysFigureSphere[];
  selected?: number | null;
  onSelect?: (number: SphereNumber) => void;
  className?: string;
  style?: CSSProperties;
}

const STROKE: Record<SphereState, string> = {
  current: "var(--sphere-current)",
  done: "var(--sphere-done)",
  locked: "var(--sphere-locked)",
};

const FILL: Record<SphereState, string> = {
  current: "var(--sphere-current-soft)",
  done: "var(--sphere-done-soft)",
  locked: "transparent",
};

const STATE_LABEL: Record<SphereState, string> = {
  current: "where you stand",
  done: "walked",
  locked: "not yet opened",
};

export function TetraktysFigure({
  spheres,
  selected,
  onSelect,
  className,
  style,
}: TetraktysFigureProps) {
  const layout = tetraktysLayout(320, 300, { top: 40, rowGap: 72, step: 76 });
  const byNumber = new Map(spheres.map((s) => [s.number, s]));

  function keyActivate(e: KeyboardEvent, n: SphereNumber): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(n);
    }
  }

  return (
    <svg
      data-component="tetraktys-figure"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      role="group"
      aria-label={_("The tetraktys ladder — ten spheres on the serpent walk")}
      className={className}
      style={style}
    >
      <polyline
        data-serpent-path
        points={layout.serpentPoints}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      {layout.points.map((p) => {
        const sphere = byNumber.get(p.number);
        const state: SphereState = sphere?.state ?? "locked";
        const name = sphere?.name ?? String(p.number);
        const isSelected = p.number === selected;
        return (
          // SVG has no <button>; role=button + tabIndex is the accessible
          // form (useSemanticElements stays a warning here by design).
          <g
            key={p.number}
            role="button"
            tabIndex={0}
            data-sphere={p.number}
            data-state={state}
            aria-label={_("Sphere {n}, {name}, {state}", {
              n: p.number,
              name,
              state: _(STATE_LABEL[state]),
            })}
            aria-pressed={isSelected}
            onClick={() => onSelect?.(p.number)}
            onKeyDown={(e) => keyActivate(e, p.number)}
            style={{ cursor: "pointer" }}
            opacity={state === "locked" ? 0.45 : 1}
          >
            {isSelected ? (
              <circle
                cx={p.x}
                cy={p.y}
                r={22}
                fill="none"
                stroke={STROKE[state]}
                strokeWidth={1}
                opacity={0.5}
              />
            ) : null}
            <circle
              cx={p.x}
              cy={p.y}
              r={16}
              fill={FILL[state]}
              stroke={STROKE[state]}
              strokeWidth={state === "current" ? 1.8 : 1.2}
            />
            <text
              x={p.x}
              y={p.y + 4.5}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={12}
              fill={STROKE[state]}
            >
              {p.number}
            </text>
            {state === "done" ? (
              <path
                d={`M${p.x - 5} ${p.y + 17} l4 4 7-7`}
                fill="none"
                stroke="var(--sphere-done)"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export const TETRAKTYS_STATE_LABELS = STATE_LABEL;
