/**
 * PlanetaryRail — left-side picker for the Magic Squares surface.
 *
 * Seven planetary squares in sacred order (Saturn → Moon — verbatim
 * from B90 PLANETARY_SQUARES). Custom rows below, with the dashed
 * "+ New custom square" action.
 */

import { type CSSProperties } from "react";

import { PLANETARY_SQUARES } from "../workshop/index.js";

import {
  PLANET_NAMES,
  RAIL_CUSTOM_EYEBROW,
  RAIL_EMPTY_CUSTOM,
  RAIL_NEW_CUSTOM,
  RAIL_PLANETARY_EYEBROW,
  type SquareId,
} from "./copy.js";

/** Glyph per planet — matches the picker tile glyphs in B91. */
const PLANET_GLYPHS: Record<
  Exclude<SquareId, "custom">,
  string
> = {
  saturn: "♄",
  jupiter: "♃",
  mars: "♂",
  sun: "☉",
  venus: "♀",
  mercury: "☿",
  moon: "☽",
};

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 260px",
  minWidth: 0,
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 14px",
  overflowY: "auto",
};

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  padding: "0 6px 10px",
};

const ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  width: "100%",
  padding: "9px 8px",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  background: "transparent",
  cursor: "pointer",
};

const ROW_ON: CSSProperties = {
  ...ROW_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

const NEW_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

export interface CustomSquareEntry {
  id: string;
  name: string;
  order: number;
}

export interface PlanetaryRailProps {
  value: SquareId;
  customValue: string | null;
  customSquares: readonly CustomSquareEntry[];
  onPick: (id: SquareId, customId?: string) => void;
  onNew: () => void;
  className?: string;
  style?: CSSProperties;
}

function customIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x={4} y={4} width={16} height={16} rx={1.5} />
      <path d="M10 4v16M14 4v16M4 10h16M4 14h16" />
    </svg>
  );
}

export function PlanetaryRail({
  value,
  customValue,
  customSquares,
  onPick,
  onNew,
  className,
  style,
}: PlanetaryRailProps) {
  return (
    <aside
      data-component="magic-squares-rail"
      className={`scroll ms-side ${className ?? ""}`}
      style={{ ...RAIL_STYLE, ...style }}
    >
      <div style={EYEBROW_STYLE}>{RAIL_PLANETARY_EYEBROW}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          marginBottom: 18,
        }}
      >
        {PLANETARY_SQUARES.map((sq) => {
          const id = sq.planet;
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              data-square={id}
              aria-pressed={on}
              onClick={() => onPick(id)}
              style={on ? ROW_ON : ROW_BASE}
            >
              <span
                style={{
                  fontFamily: "var(--font-glyph)",
                  fontSize: 17,
                  color: on ? "var(--accent)" : "var(--ink-soft)",
                  width: 22,
                  flex: "none",
                  textAlign: "center",
                }}
              >
                {PLANET_GLYPHS[id]}
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>
                {PLANET_NAMES[id]}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {sq.order}
              </span>
            </button>
          );
        })}
      </div>

      <div style={EYEBROW_STYLE}>{RAIL_CUSTOM_EYEBROW}</div>
      {customSquares.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
            padding: "0 6px 12px",
          }}
        >
          {RAIL_EMPTY_CUSTOM}
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            marginBottom: 12,
          }}
        >
          {customSquares.map((entry) => {
            const on = value === "custom" && customValue === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                data-custom-square={entry.id}
                aria-pressed={on}
                onClick={() => onPick("custom", entry.id)}
                style={on ? ROW_ON : ROW_BASE}
              >
                <span
                  style={{
                    width: 22,
                    flex: "none",
                    textAlign: "center",
                    color: "var(--ink-mute)",
                  }}
                >
                  {customIcon()}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {entry.order}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        data-action="new-custom-square"
        onClick={onNew}
        style={NEW_BUTTON}
      >
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {RAIL_NEW_CUSTOM}
      </button>
    </aside>
  );
}
