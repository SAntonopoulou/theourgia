/**
 * Stat — dashboard tile (label + value + optional spark + optional delta).
 *
 * Used on the analytics surfaces and the Today page. Composes inside a
 * Card; doesn't bring its own surface.
 *
 * The sparkline is a hand-rolled inline SVG — no chart library dep. It
 * accepts a number[] of arbitrary length and renders a single polyline
 * scaled to the supplied dimensions.
 */

import type { CSSProperties, ReactNode } from "react";

export type StatTone = "neutral" | "positive" | "negative";

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional sparkline series. Min 2 points required to render. */
  spark?: readonly number[];
  /**
   * Optional change indicator. Rendered as a tone-colored small text
   * below or beside the value. Sign drives the tone unless ``tone`` is
   * explicit.
   */
  delta?: number;
  /** Override the auto-detected tone (sign of delta). */
  tone?: StatTone;
  /** Suffix appended to the delta (e.g. "%"). Defaults to "%". */
  deltaUnit?: string;
  className?: string;
  style?: CSSProperties;
}

function autoTone(delta: number | undefined): StatTone {
  if (delta === undefined) return "neutral";
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

function toneColor(tone: StatTone): string {
  switch (tone) {
    case "positive":
      return "var(--success)";
    case "negative":
      return "var(--danger)";
    default:
      return "var(--ink-mute)";
  }
}

function Spark({ values }: { values: readonly number[] }) {
  if (values.length < 2) return null;
  const width = 80;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ color: "var(--accent)" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Stat({
  label,
  value,
  spark,
  delta,
  tone,
  deltaUnit = "%",
  className,
  style,
}: StatProps) {
  const resolvedTone = tone ?? autoTone(delta);
  const composedStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1, 4px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    ...style,
  };

  return (
    <div className={className} style={composedStyle}>
      <span
        style={{
          fontSize: "var(--type-caption, 11px)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--type-h2, 28px)",
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {spark || delta !== undefined ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3, 12px)" }}>
          {spark ? <Spark values={spark} /> : null}
          {delta !== undefined ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-ui, 12px)",
                color: toneColor(resolvedTone),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {delta > 0 ? "+" : ""}
              {delta}
              {deltaUnit}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
