/**
 * MethodPicker — coin vs yarrow toggle + per-method note.
 *
 * Verbatim from `Theourgia I Ching.dc.html` lines 96-103. The two
 * methods are NOT interchangeable: yarrow is the slower meditative
 * rite with different odds (1/16 · 5/16 · 7/16 · 3/16). The UI
 * respects that pacing — the surface withholds the "Cast all six"
 * shortcut when yarrow is active.
 */

import { type CSSProperties } from "react";

import type { IchingMethod } from "../divination/index.js";
import { METHOD_NOTES } from "./copy.js";

export interface MethodPickerProps {
  value: IchingMethod;
  onChange: (method: IchingMethod) => void;
  className?: string;
  style?: CSSProperties;
}

const BUTTON_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const BUTTON_ON: CSSProperties = {
  ...BUTTON_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export function MethodPicker({
  value,
  onChange,
  className,
  style,
}: MethodPickerProps) {
  return (
    <div
      data-component="iching-method-picker"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div role="group" aria-label="Method" style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          aria-pressed={value === "coin"}
          data-method="coin"
          onClick={() => onChange("coin")}
          style={value === "coin" ? BUTTON_ON : BUTTON_BASE}
        >
          <span
            style={{ fontFamily: "var(--font-glyph)" }}
            aria-hidden="true"
          >
            ☷
          </span>
          Three coins
        </button>
        <button
          type="button"
          aria-pressed={value === "yarrow"}
          data-method="yarrow"
          onClick={() => onChange("yarrow")}
          style={value === "yarrow" ? BUTTON_ON : BUTTON_BASE}
        >
          <span
            style={{ fontFamily: "var(--font-glyph)" }}
            aria-hidden="true"
          >
            ‖
          </span>
          Yarrow stalks
        </button>
      </div>
      <span
        data-method-note
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        {METHOD_NOTES[value]}
      </span>
    </div>
  );
}
