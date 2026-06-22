/**
 * RuneSizePicker — three-chip group for the draw size.
 *
 * Verbatim from `Theourgia Runes.dc.html` lines 98-104.
 */

import { type CSSProperties } from "react";

import type { RuneDrawSize } from "../divination/index.js";
import { RUNES_SIZE_OPTIONS } from "./copy.js";

export interface RuneSizePickerProps {
  value: RuneDrawSize;
  onChange: (size: RuneDrawSize) => void;
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

export function RuneSizePicker({
  value,
  onChange,
  className,
  style,
}: RuneSizePickerProps) {
  return (
    <div
      role="group"
      aria-label="Draw size"
      data-component="rune-size-picker"
      className={className}
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {RUNES_SIZE_OPTIONS.map((opt) => {
        const on = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={on}
            data-size={opt.key}
            onClick={() => onChange(opt.key)}
            style={on ? CHIP_ON : CHIP_BASE}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
