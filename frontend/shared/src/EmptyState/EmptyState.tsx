/**
 * EmptyState — humane fallback for empty collections.
 *
 * Every list / feed / collection in the product needs one (per agent
 * onboarding §3.3). The voice is humane and quiet — "Nothing written
 * yet" beats "No items found"; "Your first entry begins the record."
 * beats "Try adding something."
 *
 * Composition: a contemplative glyph, a single-line title, optional
 * body prose, optional action element (typically a Button). The glyph
 * is large enough to register (40px); the prose is constrained in
 * width so the wrap feels deliberate.
 */

import type { CSSProperties, ReactNode } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export interface EmptyStateProps {
  glyph?: GlyphName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function EmptyState({
  glyph,
  title,
  body,
  action,
  className,
  style,
}: EmptyStateProps): JSX.Element {
  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3, 12px)",
    padding: "var(--space-7, 48px) var(--space-5, 24px)",
    textAlign: "center",
    color: "var(--ink-soft)",
    fontFamily: "var(--font-serif, Georgia, serif)",
    maxWidth: 480,
    margin: "0 auto",
    ...style,
  };

  return (
    <div className={className} style={wrapperStyle} role="status">
      {glyph ? (
        <Glyph
          name={glyph}
          size={40}
          style={{ color: "var(--ink-mute)" }}
        />
      ) : null}
      <h3
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: "var(--type-h3, 18px)",
          color: "var(--ink)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {body ? (
        <p
          style={{
            fontSize: "var(--type-body-sm, 14px)",
            color: "var(--ink-mute)",
            lineHeight: "var(--leading-body, 1.62)",
            margin: 0,
          }}
        >
          {body}
        </p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
