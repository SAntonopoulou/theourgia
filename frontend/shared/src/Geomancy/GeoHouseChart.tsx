/**
 * GeoHouseChart — 4×4 grid placing the 12 houses around the centre.
 *
 * Verbatim from `Theourgia Geomancy.dc.html` lines 237-257. Houses
 * I..XII run clockwise from top-left around the outer ring; the
 * centre 2×2 holds witnesses + Judge + Reconciler.
 *
 *   Grid (row, col):
 *     House I   = (1,1)   House II  = (1,2)   House III = (1,3)   House IV = (1,4)
 *     House XII = (2,1)   R.witness = (2,2)   L.witness = (2,3)   House V  = (2,4)
 *     House XI  = (3,1)   The Judge = (3,2)   Reconciler= (3,3)   House VI = (3,4)
 *     House X   = (4,1)   House IX  = (4,2)   House VIII= (4,3)   House VII= (4,4)
 */

import { type CSSProperties } from "react";

import {
  type GeomancyShield,
  figureName,
} from "../divination/index.js";
import {
  HOUSE_NUMERALS,
  LEFT_WITNESS_LABEL,
  RECONCILER_LABEL,
  RIGHT_WITNESS_LABEL,
} from "./copy.js";
import { GeoFigureView } from "./GeoFigureView.js";

export interface GeoHouseChartProps {
  shield: GeomancyShield;
  /** 0-based index of the selected house (0..11). */
  selectedHouse: number;
  onSelectHouse: (index: number) => void;
  className?: string;
  style?: CSSProperties;
}

// Outer-ring grid positions in [row, col] (1-indexed). Matches the
// mockup's `ringPos` array verbatim (line 239).
const RING_POS: ReadonlyArray<[number, number]> = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [4, 3],
  [4, 2],
  [4, 1],
  [3, 1],
  [2, 1],
];

// Centre cells: [row, col, label, figureKey].
const CENTRE_CELLS: ReadonlyArray<{
  pos: [number, number];
  label: string;
  source: "rightWitness" | "leftWitness" | "judge" | "reconciler";
}> = [
  { pos: [2, 2], label: RIGHT_WITNESS_LABEL, source: "rightWitness" },
  { pos: [2, 3], label: LEFT_WITNESS_LABEL, source: "leftWitness" },
  { pos: [3, 2], label: "The Judge", source: "judge" },
  { pos: [3, 3], label: RECONCILER_LABEL, source: "reconciler" },
];

export function GeoHouseChart({
  shield,
  selectedHouse,
  onSelectHouse,
  className,
  style,
}: GeoHouseChartProps) {
  return (
    <div
      data-component="geo-house-chart"
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: 7,
        maxWidth: 480,
        ...style,
      }}
    >
      {/* Outer ring — 12 houses */}
      {RING_POS.map(([row, col], h) => {
        const fig = shield.houses[h]!;
        const on = selectedHouse === h;
        const name = figureName(fig) ?? "—";
        return (
          <button
            key={`house-${h}`}
            type="button"
            data-house-index={h}
            data-house-numeral={HOUSE_NUMERALS[h]}
            data-selected={on ? "true" : "false"}
            aria-pressed={on}
            aria-label={`House ${HOUSE_NUMERALS[h]}, ${name}`}
            onClick={() => onSelectHouse(h)}
            style={{
              gridRow: row,
              gridColumn: col,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "8px 4px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: on ? "var(--accent)" : "var(--line)",
              borderRadius: 6,
              background: on ? "var(--accent-soft)" : "var(--bg-2)",
              minHeight: 78,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 9.5,
                letterSpacing: "0.06em",
                color: on ? "var(--accent)" : "var(--ink-mute)",
              }}
            >
              {HOUSE_NUMERALS[h]}
            </span>
            <GeoFigureView
              figure={fig}
              dotSize={5}
              color={on ? "var(--accent)" : "var(--ink-soft)"}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10.5,
                color: "var(--ink-soft)",
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {name}
            </span>
          </button>
        );
      })}

      {/* Centre 2×2 — witnesses + judge + reconciler */}
      {CENTRE_CELLS.map((c, i) => {
        const fig = shield[c.source];
        const name = figureName(fig) ?? "—";
        return (
          <div
            key={`centre-${i}`}
            data-centre-cell={c.source}
            style={{
              gridRow: c.pos[0],
              gridColumn: c.pos[1],
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "8px 4px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: 6,
              background: "var(--bg-3)",
              minHeight: 78,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 8.5,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                textAlign: "center",
              }}
            >
              {c.label}
            </span>
            <GeoFigureView
              figure={fig}
              dotSize={5}
              color="var(--accent)"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10,
                color: "var(--accent)",
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
