/**
 * CitationKindBadge — small square badge denoting the authority of
 * a festival source (primary · scholarly · community).
 *
 * Per `Theourgia Calendar.dc.html`. Three classes:
 *   - primary   (‡) — ancient / medieval witness  → --ink
 *   - scholarly (❖) — modern academic              → --ink-soft
 *   - community (✦) — contemporary practice       → --accent
 *
 * The shape is a 24×24 rounded square; the glyph is the visible
 * mark; the colour carries the second signal.
 */

import { type CSSProperties } from "react";

import { CITATION_KINDS, type CitationKind } from "./festivals.js";

export interface CitationKindBadgeProps {
  kind: CitationKind;
  /** Override the rendered title (defaults to the full label). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function CitationKindBadge({
  kind,
  title,
  className,
  style,
}: CitationKindBadgeProps) {
  const meta = CITATION_KINDS[kind];
  return (
    <span
      className={className}
      data-component="citation-kind-badge"
      data-citation-kind={kind}
      title={title ?? meta.full}
      aria-label={meta.label}
      style={{
        width: 24,
        height: 24,
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        background: "var(--bg-3)",
        fontFamily: "var(--font-glyph)",
        fontSize: 13,
        color: meta.color,
        ...style,
      }}
    >
      {meta.glyph}
    </span>
  );
}
