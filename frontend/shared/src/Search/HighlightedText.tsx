/**
 * HighlightedText — renders text with case-insensitive hit
 * highlighting against a query.
 *
 * Per `Theourgia Search.dc.html`. Hit runs use the --hit / --hit-bg
 * tokens (warm amber); non-hit runs inherit `currentColor`. The
 * component is purely presentational — the parent decides the base
 * font + colour.
 */

import { type CSSProperties } from "react";

import { highlightSegments } from "./highlight.js";

export interface HighlightedTextProps {
  text: string;
  query?: string;
  className?: string;
  style?: CSSProperties;
}

export function HighlightedText({
  text,
  query,
  className,
  style,
}: HighlightedTextProps) {
  const segments = highlightSegments(text, query);
  return (
    <span
      className={className}
      data-component="highlighted-text"
      style={style}
    >
      {segments.map((s, i) =>
        s.hit ? (
          <mark
            key={i}
            data-hit
            style={{
              color: "var(--hit)",
              background: "var(--hit-bg)",
              padding: "0 1px",
              borderRadius: 2,
            }}
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}
