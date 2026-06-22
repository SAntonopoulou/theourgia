/**
 * CentrePicker — 2-column tile grid (7 centre kinds).
 *
 * Each tile renders a small (60×60) thumbnail using B90 centreSymbol
 * for the four canonical symbols (pentagram / hexagram / unicursal /
 * solomonic). Sigil / Square trace / Blank render minimal placeholder
 * marks since they're caller-supplied in the live preview.
 */

import * as React from "react";
import { type CSSProperties } from "react";

import { centreSymbol } from "../workshop/index.js";

import { CENTRE_OPTIONS, type CentreElement } from "./copy.js";

const TILE_BASE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
  padding: "10px 4px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
  cursor: "pointer",
};

const TILE_ON: CSSProperties = {
  ...TILE_BASE,
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

function renderThumb(kind: CentreElement): React.ReactElement {
  if (
    kind === "pentagram" ||
    kind === "hexagram" ||
    kind === "unicursal" ||
    kind === "solomonic"
  ) {
    const sym = centreSymbol(kind, 30, 30, 18);
    return (
      <svg width={30} height={30} viewBox="0 0 60 60">
        {sym.auxD ? (
          <path
            d={sym.auxD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1}
            opacity={0.5}
          />
        ) : null}
        <path
          d={sym.d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "sigil") {
    return (
      <svg width={30} height={30} viewBox="0 0 60 60" aria-hidden="true">
        <path
          d="M18 35 Q30 12 42 35 M22 30 L38 30"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "square") {
    return (
      <svg width={30} height={30} viewBox="0 0 60 60" aria-hidden="true">
        <rect
          x={18}
          y={18}
          width={24}
          height={24}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.5}
        />
        <path
          d="M22 22 L42 30 L26 42"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={30} height={30} viewBox="0 0 60 60" aria-hidden="true">
      <text
        x={30}
        y={34}
        textAnchor="middle"
        fontSize={11}
        fill="var(--ink-mute)"
      >
        —
      </text>
    </svg>
  );
}

export interface CentrePickerProps {
  value: CentreElement;
  onChange: (next: CentreElement) => void;
  className?: string;
  style?: CSSProperties;
}

export function CentrePicker({
  value,
  onChange,
  className,
  style,
}: CentrePickerProps) {
  return (
    <div
      data-component="magical-circle-centre-picker"
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 7,
        ...style,
      }}
    >
      {CENTRE_OPTIONS.map((opt) => {
        const on = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={on}
            data-centre={opt.key}
            onClick={() => onChange(opt.key)}
            style={on ? TILE_ON : TILE_BASE}
          >
            {renderThumb(opt.key)}
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: on ? "var(--ink)" : "var(--ink-soft)",
                textAlign: "center",
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
