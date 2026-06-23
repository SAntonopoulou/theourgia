/**
 * SensationTypeGrid — 12-cell picker for a sensation type.
 *
 * Per `Theourgia Body Sensation.dc.html`. The same 12 sensation types
 * the `SensationConfig` panel exposes, but shipped as its own
 * primitive so the surface's "Place a sensation" panel (rendered
 * when no marker is selected) composes from the same atom.
 *
 * Glyph slots default to a colored dot; callers can pass their own
 * SVGs via the `glyphs` prop (typically the design's stroke glyphs).
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  SENSATION_TYPES,
  SENSATION_TYPE_ORDER,
  type SensationType,
} from "../SensationConfig/SensationConfig.js";

export interface SensationTypeGridProps {
  value: SensationType;
  onChange?: (next: SensationType) => void;
  /** Optional pre-rendered glyph nodes keyed by sensation-type. */
  glyphs?: Partial<Record<SensationType, ReactNode>>;
  /** Restrict the picker to a subset of types in their canonical order. */
  types?: SensationType[];
  className?: string;
  style?: CSSProperties;
}

function DefaultGlyph({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        display: "block",
      }}
    />
  );
}

function cellStyle(active: boolean, color: string): CSSProperties {
  return {
    aspectRatio: "1",
    minWidth: 24,
    minHeight: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    color: active ? color : "var(--ink-mute)",
    background: active
      ? `color-mix(in srgb, ${color} 16%, transparent)`
      : "var(--bg-sunk)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? color : "var(--line)",
    cursor: "pointer",
    padding: 0,
  };
}

export function SensationTypeGrid({
  value,
  onChange,
  glyphs,
  types,
  className,
  style,
}: SensationTypeGridProps) {
  const order = types ?? SENSATION_TYPE_ORDER;

  return (
    <div
      className={className}
      data-component="sensation-type-grid"
      data-value={value}
      role="radiogroup"
      aria-label="Sensation type"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 6,
        ...style,
      }}
    >
      {order.map((type) => {
        const meta = SENSATION_TYPES[type];
        const on = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            data-sensation-type={type}
            data-active={on ? "true" : "false"}
            aria-checked={on}
            title={meta.label}
            aria-label={meta.label}
            onClick={() => onChange?.(type)}
            style={cellStyle(on, meta.color)}
          >
            {glyphs?.[type] ?? <DefaultGlyph color={meta.color} />}
          </button>
        );
      })}
    </div>
  );
}
