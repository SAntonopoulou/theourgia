/**
 * RuneTile — single stave card.
 *
 * Verbatim from `tile()` in `Theourgia Runes.dc.html` (lines 213-223).
 * 104×138 tile with the rune glyph in --font-rune at 52px (or 24
 * when miniature). Selected → 2px accent ring + bigger shadow.
 * Merkstave → glyph rotated 180° + ⟲ corner.
 *
 * Per H04 §S3.5 the merkstave indicator is only ever set when the
 * draw engine marks it; symmetric staves NEVER show this indicator
 * because the engine forces merkstave: false on them.
 */

import { type CSSProperties } from "react";

import type { Rune } from "../divination/index.js";

export interface RuneTileProps {
  rune: Rune;
  /** Position label for screen readers. */
  positionLabel?: string;
  /** When true, glyph rotates 180° + ⟲ corner shows. Never set for
   *  symmetric staves (the engine forbids it). */
  merkstave?: boolean;
  selected?: boolean;
  onClick?: () => void;
  /** Optional size override; defaults to the mockup's 104×138. */
  width?: number;
  className?: string;
  style?: CSSProperties;
}

export function RuneTile({
  rune,
  positionLabel,
  merkstave = false,
  selected = false,
  onClick,
  width = 104,
  className,
  style,
}: RuneTileProps) {
  const height = Math.round(width * 1.327); // 138/104 = ~1.327
  const glyphSize = Math.round(width * 0.5);

  const ariaLabel = positionLabel
    ? `${positionLabel}: ${rune.name}${merkstave ? " (merkstave)" : ""}`
    : `${rune.name}${merkstave ? " (merkstave)" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-component="rune-tile"
      data-rune-name={rune.name}
      data-merkstave={merkstave ? "true" : "false"}
      data-symmetric={rune.symmetric ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      className={className}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "var(--accent)" : "var(--line-2)",
        background:
          "linear-gradient(180deg, var(--bg-3), var(--bg-2))",
        boxShadow: selected
          ? "0 0 0 2px var(--accent-soft), 0 6px 18px rgba(0,0,0,.35)"
          : "0 3px 10px rgba(0,0,0,.28)",
        transition: "all .15s ease",
        flex: "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <div
        style={{
          transform: merkstave ? "rotate(180deg)" : "none",
          display: "flex",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-rune)",
            fontSize: glyphSize,
            lineHeight: 1,
            color: selected ? "var(--accent)" : "var(--ink)",
          }}
        >
          {rune.glyph}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: selected ? "var(--ink)" : "var(--ink-soft)",
        }}
      >
        {rune.name}
      </span>
      {merkstave ? (
        <span
          data-merkstave-indicator
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 6,
            right: 7,
            fontFamily: "var(--font-glyph)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          ⟲
        </span>
      ) : null}
    </button>
  );
}
