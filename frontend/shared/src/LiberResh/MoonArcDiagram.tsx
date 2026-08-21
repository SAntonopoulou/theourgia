/**
 * MoonArcDiagram — the lunar counterpart of SunArcDiagram: the moon's
 * day-arc above the horizon (solid), its course below (dashed), the four
 * lunar stations (moonrise · upper culmination · moonset · lower
 * culmination), and a moon glyph that moves along the arc proportional to
 * how far through its time-above-horizon it is.
 *
 * Purely representational — the caller supplies the fraction. Placed beside
 * the sun's course so Today tracks both bodies through the day.
 */

import type { CSSProperties, ReactNode } from "react";

export interface MoonArcDiagramProps {
  /** 0..1 fraction of the moon's time above the horizon elapsed (moonrise →
   *  moonset). Below 0 = before moonrise, above 1 = after moonset. Clamped to
   *  [0,1] for the visible moon position. */
  aboveFraction: number;
  /** Whether the moon is currently above the horizon. Defaults to
   *  `aboveFraction >= 0 && <= 1`. When false, the moon glyph is hidden. */
  isUp?: boolean;
  /** Editorial caption rendered below the diagram. */
  caption?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function MoonArcDiagram({
  aboveFraction,
  isUp,
  caption,
  className,
  style,
}: MoonArcDiagramProps) {
  const fraction = Math.max(0, Math.min(1, aboveFraction));
  const moonUp = isUp ?? (aboveFraction >= 0 && aboveFraction <= 1);

  // θ traces the upper arc from East (π) to West (0).
  const theta = Math.PI * (1 - fraction);
  const cx = 120 + 90 * Math.cos(theta);
  const cy = 112 - 90 * Math.sin(theta);

  return (
    <div
      className={className}
      data-component="moon-arc-diagram"
      data-is-up={moonUp ? "true" : "false"}
      style={{
        background: "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "16px 18px 12px",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 6,
        }}
      >
        The moon’s course
      </div>
      <svg viewBox="0 0 240 156" width="100%" style={{ display: "block" }} aria-hidden="true">
        {/* horizon line */}
        <line x1={16} y1={112} x2={224} y2={112} stroke="var(--line-2)" strokeWidth={1} />
        {/* above-horizon arc (solid) */}
        <path d="M30 112 A90 90 0 0 1 210 112" fill="none" stroke="var(--line-2)" strokeWidth={1} />
        {/* below-horizon arc (dashed) */}
        <path
          d="M30 112 A90 90 0 0 0 210 112"
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {/* station ticks */}
        <circle cx={30} cy={112} r={3} fill="var(--sky)" data-tick="moonrise" />
        <circle cx={120} cy={22} r={3} fill="var(--sky)" data-tick="upperCulmination" />
        <circle cx={210} cy={112} r={3} fill="var(--sky)" data-tick="moonset" />
        <circle cx={120} cy={140} r={3} fill="var(--sky)" data-tick="lowerCulmination" />
        {/* current moon */}
        {moonUp ? (
          <>
            <circle cx={cx} cy={cy} r={6.5} fill="var(--sky)" data-moon-dot />
            <circle
              cx={cx}
              cy={cy}
              r={11}
              fill="none"
              stroke="var(--sky)"
              strokeWidth={1}
              opacity={0.5}
              data-moon-halo
            />
          </>
        ) : null}
        {/* labels */}
        <text
          x={30}
          y={128}
          textAnchor="middle"
          fontFamily="Inria Sans, sans-serif"
          fontSize={9}
          fill="var(--ink-mute)"
        >
          E · rise
        </text>
        <text
          x={120}
          y={14}
          textAnchor="middle"
          fontFamily="Inria Sans, sans-serif"
          fontSize={9}
          fill="var(--ink-mute)"
        >
          culmination
        </text>
        <text
          x={210}
          y={128}
          textAnchor="middle"
          fontFamily="Inria Sans, sans-serif"
          fontSize={9}
          fill="var(--ink-mute)"
        >
          W · set
        </text>
        <text
          x={120}
          y={152}
          textAnchor="middle"
          fontFamily="Inria Sans, sans-serif"
          fontSize={9}
          fill="var(--ink-mute)"
        >
          nadir
        </text>
      </svg>
      {caption ? (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
            marginTop: 4,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}
