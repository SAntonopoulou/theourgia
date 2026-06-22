/**
 * SpreadPicker — five-chip group selecting the spread layout.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 111-115 + the
 * spreadDefs at line 323. Labels: "Single" / "Three-card" / "Celtic
 * Cross" / "Relationship" / "Year ahead".
 */

import { type CSSProperties } from "react";

import type { SpreadKind } from "../divination/index.js";
import { TAROT_SPREAD_CHIPS } from "./copy.js";

export interface SpreadPickerProps {
  value: SpreadKind;
  onChange: (kind: SpreadKind) => void;
  className?: string;
  style?: CSSProperties;
}

const CHIP_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const CHIP_ON: CSSProperties = {
  ...CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export function SpreadPicker({
  value,
  onChange,
  className,
  style,
}: SpreadPickerProps) {
  return (
    <div
      role="group"
      aria-label="Spread"
      data-component="spread-picker"
      className={className}
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {TAROT_SPREAD_CHIPS.map((c) => {
        const on = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.key)}
            style={on ? CHIP_ON : CHIP_BASE}
            data-spread={c.key}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
