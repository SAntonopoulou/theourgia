/**
 * SunArcDiagram — compact SVG showing the day-arc above the horizon
 * (solid), the night-arc below (dashed), four station ticks (sunrise
 * / zenith / sunset / nadir), and a current-sun dot that moves along
 * the day-arc proportional to local time.
 *
 * Per `Theourgia Liber Resh.dc.html`. The diagram is purely
 * representational — caller supplies the daylight fraction. Below
 * the SVG sits a one-line editorial caption.
 */

import { type CSSProperties, type ReactNode } from "react";

export interface SunArcDiagramProps {
  /** 0..1 fraction of daylight elapsed; below 0 = before sunrise,
   *  above 1 = after sunset. The diagram clamps to [0,1] for the
   *  visible sun position. */
  daylightFraction: number;
  /** Whether the sun is currently above the horizon. Defaults to
   *  `daylightFraction >= 0 && <= 1`. When false, the visible sun
   *  glyph is hidden and the night dot is highlighted. */
  isDay?: boolean;
  /** Editorial caption rendered below the diagram. */
  caption?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function SunArcDiagram({
  daylightFraction,
  isDay,
  caption,
  className,
  style,
}: SunArcDiagramProps) {
  const fraction = Math.max(0, Math.min(1, daylightFraction));
  const sunUp =
    isDay ?? (daylightFraction >= 0 && daylightFraction <= 1);

  // θ traces the upper arc from East (π) to West (0).
  const theta = Math.PI * (1 - fraction);
  const cx = 120 + 90 * Math.cos(theta);
  const cy = 112 - 90 * Math.sin(theta);

  return (
    <div
      className={className}
      data-component="sun-arc-diagram"
      data-is-day={sunUp ? "true" : "false"}
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
        The sun’s course
      </div>
      <svg
        viewBox="0 0 240 156"
        width="100%"
        style={{ display: "block" }}
        aria-hidden="true"
      >
        {/* horizon line */}
        <line
          x1={16}
          y1={112}
          x2={224}
          y2={112}
          stroke="var(--line-2)"
          strokeWidth={1}
        />
        {/* day arc (solid) */}
        <path
          d="M30 112 A90 90 0 0 1 210 112"
          fill="none"
          stroke="var(--line-2)"
          strokeWidth={1}
        />
        {/* night arc (dashed) */}
        <path
          d="M30 112 A90 90 0 0 0 210 112"
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {/* station ticks */}
        <circle
          cx={30}
          cy={112}
          r={3}
          fill="var(--sun-warm)"
          data-tick="sunrise"
        />
        <circle
          cx={120}
          cy={22}
          r={3}
          fill="var(--sun-warm)"
          data-tick="noon"
        />
        <circle
          cx={210}
          cy={112}
          r={3}
          fill="var(--sun-warm)"
          data-tick="sunset"
        />
        <circle
          cx={120}
          cy={140}
          r={3}
          fill={sunUp ? "var(--sky)" : "var(--sun-warm)"}
          data-tick="midnight"
        />
        {/* current sun */}
        {sunUp ? (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={6.5}
              fill="var(--sun-warm)"
              data-sun-dot
            />
            <circle
              cx={cx}
              cy={cy}
              r={11}
              fill="none"
              stroke="var(--sun-warm)"
              strokeWidth={1}
              opacity={0.5}
              data-sun-halo
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
          zenith
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
