/**
 * Badge — labels with semantic tone.
 *
 * Six tones, each pairing color with optional glyph (the color-never-alone
 * rule):
 *
 *   neutral  — quiet, generic label
 *   info     — informational
 *   success  — positive state (signed, verified, OK)
 *   warning  — caveat / advisory
 *   danger   — destructive / sealed / oxblood
 *   trust    — federation trust badge (gold accent on accent-soft)
 *
 * Always paired with text or a glyph (color is never the only cue). Sizes
 * are fixed — badges should not vary in scale within a context; tones
 * carry meaning, sizes do not.
 */

import type { CSSProperties, ReactNode } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "trust";

export interface BadgeProps {
  tone?: BadgeTone;
  glyph?: GlyphName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function toneStyle(tone: BadgeTone): CSSProperties {
  switch (tone) {
    case "neutral":
      return {
        background: "var(--bg-3, var(--bg-2))",
        color: "var(--ink-soft, var(--ink))",
        border: "1px solid var(--line)",
      };
    case "info":
      return {
        background: "var(--info-soft, var(--bg-2))",
        color: "var(--info)",
        border: "1px solid var(--info)",
      };
    case "success":
      return {
        background: "var(--success-soft, var(--bg-2))",
        color: "var(--success)",
        border: "1px solid var(--success)",
      };
    case "warning":
      return {
        background: "var(--warning-soft, var(--bg-2))",
        color: "var(--warning)",
        border: "1px solid var(--warning)",
      };
    case "danger":
      return {
        background: "var(--danger-soft, var(--bg-2))",
        color: "var(--danger)",
        border: "1px solid var(--danger)",
      };
    case "trust":
      return {
        background: "var(--accent-soft, var(--bg-2))",
        color: "var(--accent)",
        border: "1px solid var(--accent)",
      };
  }
}

export function Badge({
  tone = "neutral",
  glyph,
  children,
  className,
  style,
}: BadgeProps): JSX.Element {
  const composedStyle: CSSProperties = {
    ...toneStyle(tone),
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1, 4px)",
    padding: "0 var(--space-2, 8px)",
    height: 22,
    minWidth: 22,
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-caption, 11px)",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    borderRadius: "var(--r-sm, 4px)",
    ...style,
  };
  return (
    <span className={className} style={composedStyle} data-tone={tone}>
      {glyph ? <Glyph name={glyph} size={12} /> : null}
      {children}
    </span>
  );
}
