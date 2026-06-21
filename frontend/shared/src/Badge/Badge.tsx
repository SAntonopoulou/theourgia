/**
 * Badge — pill-shape label with semantic tone.
 *
 * Faithful to the Foundations § "Status & tags" treatment: a thin
 * line-bordered pill on a transparent background, with the tone carried
 * by *text color* (so it sits cleanly over any surface without competing
 * with the page's elevation hierarchy).
 *
 * Six tones, each paired with optional glyph (per the design's
 * color-never-alone rule — see Foundations § Accessibility):
 *
 *   neutral  — quiet, generic label (ink-soft)
 *   info     — informational (info hue)
 *   success  — verified / signed / OK
 *   warning  — pending / caveat
 *   danger   — revoked / destructive
 *   trust    — federation trust (accent gold)
 */

import type { CSSProperties, ReactNode } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "trust";

export interface BadgeProps {
  tone?: BadgeTone;
  glyph?: GlyphName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function toneColor(tone: BadgeTone): string {
  switch (tone) {
    case "neutral":
      return "var(--ink-soft)";
    case "info":
      return "var(--info)";
    case "success":
      return "var(--success)";
    case "warning":
      return "var(--warning)";
    case "danger":
      return "var(--danger)";
    case "trust":
      return "var(--accent)";
  }
}

export function Badge({ tone = "neutral", glyph, children, className, style }: BadgeProps) {
  const composedStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 11px",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: 11.5,
    color: toneColor(tone),
    background: "transparent",
    border: "1px solid var(--line)",
    borderRadius: 999,
    ...style,
  };
  return (
    <span className={className} style={composedStyle} data-tone={tone}>
      {glyph ? <Glyph name={glyph} size={12} /> : null}
      {children}
    </span>
  );
}
