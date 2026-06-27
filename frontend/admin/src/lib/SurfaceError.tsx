/**
 * Inline `--warn-soft` error banner — the established admin convention
 * for surface-level fetch failures.
 *
 * One sentence, plain language, no stack traces. The banner mounts at
 * the top of the surface (above the design's chrome). It carries an
 * optional Retry action when the parent passes ``onRetry``.
 */

import type { CSSProperties, ReactNode } from "react";

export interface SurfaceErrorProps {
  readonly title?: string;
  readonly message: ReactNode;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
}

const STYLE: CSSProperties = {
  margin: "12px 16px",
  padding: "12px 14px",
  background: "var(--warn-soft)",
  borderLeftStyle: "solid",
  borderLeftWidth: 3,
  borderLeftColor: "var(--warn)",
  borderRadius: 4,
  color: "var(--ink)",
  fontSize: 14,
  lineHeight: 1.5,
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
};

const BODY: CSSProperties = { flex: 1 };
const TITLE: CSSProperties = {
  margin: "0 0 4px",
  fontWeight: 600,
  color: "var(--ink)",
};
const RETRY_BUTTON: CSSProperties = {
  flexShrink: 0,
  background: "transparent",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--warn)",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
  color: "var(--warn)",
  fontSize: 13,
  fontWeight: 500,
};

export function SurfaceError({
  title = "Something didn’t load.",
  message,
  onRetry,
  retryLabel = "Try again",
}: SurfaceErrorProps) {
  return (
    <div role="alert" style={STYLE} data-surface-error>
      <div style={BODY}>
        <p style={TITLE}>{title}</p>
        <p style={{ margin: 0 }}>{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={RETRY_BUTTON}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
