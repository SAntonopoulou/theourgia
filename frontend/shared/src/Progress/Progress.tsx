/**
 * Progress — value-over-max bar with optional label.
 *
 * Uses native ``<progress>`` so screen readers announce naturally. Custom
 * track / fill via inline-injected `::-webkit-progress-*` and
 * `::-moz-progress-*` pseudo-element rules (one injection per module
 * load, SSR-safe). For ``indeterminate``, omit ``value``.
 */

import { type CSSProperties, type ReactNode, useEffect } from "react";

const STYLE_ID = "theourgia-progress-styles";

const CSS = `
.theo-progress {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: var(--progress-h, 8px);
  border: none;
  border-radius: var(--r-pill, 999px);
  overflow: hidden;
  background-color: var(--bg-3, var(--bg-2));
  color: var(--accent);
}
.theo-progress::-webkit-progress-bar {
  background-color: var(--bg-3, var(--bg-2));
  border-radius: var(--r-pill, 999px);
}
.theo-progress::-webkit-progress-value {
  background-color: var(--accent);
  border-radius: var(--r-pill, 999px);
  transition: inline-size 220ms ease;
}
.theo-progress::-moz-progress-bar {
  background-color: var(--accent);
  border-radius: var(--r-pill, 999px);
}
@keyframes theo-progress-indeterminate {
  0%   { background-position: 0 0; }
  100% { background-position: 32px 0; }
}
.theo-progress[data-indeterminate="true"] {
  background-image: repeating-linear-gradient(
    -45deg,
    var(--bg-3, var(--bg-2)) 0 8px,
    var(--bg-2) 8px 16px
  );
  animation: theo-progress-indeterminate 1.2s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .theo-progress[data-indeterminate="true"] { animation: none; }
}
`;

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

export type ProgressSize = "sm" | "md";

export interface ProgressProps {
  /** Current value; omit to render an indeterminate animated bar. */
  value?: number;
  /** Max value. Default 100. Ignored when indeterminate. */
  max?: number;
  /** Optional inline label rendered above the bar. */
  label?: ReactNode;
  /** Accessible name when no visible label is supplied. */
  ariaLabel?: string;
  size?: ProgressSize;
  className?: string;
  style?: CSSProperties;
}

const SIZE_PX: Record<ProgressSize, number> = { sm: 6, md: 8 };

export function Progress({
  value,
  max = 100,
  label,
  ariaLabel,
  size = "md",
  className,
  style,
}: ProgressProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  const indeterminate = value === undefined;
  const heightVar = { "--progress-h": `${SIZE_PX[size]}px` } as CSSProperties;

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}
    >
      {label ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--type-caption, 11px)",
            color: "var(--ink-soft)",
          }}
        >
          <span>{label}</span>
          {!indeterminate ? (
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-mute)" }}>
              {Math.round((value / max) * 100)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <progress
        className="theo-progress"
        value={indeterminate ? undefined : value}
        max={max}
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        data-indeterminate={indeterminate ? "true" : undefined}
        style={heightVar}
      />
    </div>
  );
}
