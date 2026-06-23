/**
 * ModeRail — left-side mode picker for the Sigil Generator.
 *
 * 11 modes in fixed order (Letter elimination → Image + vectorize).
 * Numbered 1..11 per the mockup. Active mode paints --accent-soft +
 * --accent border + ink number; inactive shows muted number + ink-soft
 * label.
 */

import { type CSSProperties } from "react";

import { MODE_RAIL_EYEBROW, SIGIL_MODES, type SigilMode } from "./copy.js";

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 240px",
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
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  padding: "0 8px 10px",
};

const BUTTON_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "9px 10px",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  textAlign: "left",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  background: "transparent",
  cursor: "pointer",
};

const BUTTON_ON: CSSProperties = {
  ...BUTTON_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

const NUM_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  width: 18,
  flex: "none",
};

export interface ModeRailProps {
  value: SigilMode;
  onChange: (next: SigilMode) => void;
  className?: string;
  style?: CSSProperties;
}

export function ModeRail({
  value,
  onChange,
  className,
  style,
}: ModeRailProps) {
  return (
    <aside
      className={`scroll sg-side ${className ?? ""}`}
      data-component="sigil-mode-rail"
      style={{ ...RAIL_STYLE, ...style }}
    >
      <div style={EYEBROW_STYLE}>{MODE_RAIL_EYEBROW}</div>
      <div role="tablist" aria-label={MODE_RAIL_EYEBROW} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {SIGIL_MODES.map((mode) => {
          const on = value === mode.key;
          return (
            <button
              key={mode.key}
              type="button"
              role="tab"
              aria-selected={on}
              data-mode={mode.key}
              onClick={() => onChange(mode.key)}
              style={on ? BUTTON_ON : BUTTON_BASE}
            >
              <span
                style={{
                  ...NUM_STYLE,
                  color: on ? "var(--accent)" : "var(--ink-mute)",
                }}
              >
                {mode.num}
              </span>
              {mode.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
