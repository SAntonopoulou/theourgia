/**
 * PlanetaryHoursRing — the day drawn to scale, as the phone draws it.
 *
 * A planetary hour is not sixty minutes: the twelve of the day divide
 * sunrise to sunset and the twelve of the night divide sunset to sunrise,
 * so in June a day-hour runs eighty minutes and a night-hour forty. A list
 * hides that; this ring shows it — sunrise at the top, the day turning
 * clockwise, every hour's arc exactly as wide as the hour actually is, the
 * daylight band thicker than the night's, and the hour in force lit wider
 * than the rest with a pale rim on both edges. Sunrise and sunset carry
 * tick lines; "now" is a needle across the band.
 *
 * The centre holds the thing being asked for: the ruler's glyph in the
 * planet's own colour, the hour's name, and how much of it is left.
 *
 * Geometry is a straight port of the phone's _RingPainter
 * (lib/features/hours/planetary_hours_screen.dart) so the two surfaces are
 * one design.
 */

import type { CSSProperties, ReactNode } from "react";

export interface RingHour {
  index: number;
  /** Lowercase body id: "sun" | "moon" | "mercury" | ... */
  ruler: string;
  glyph: string;
  start: string;
  end: string;
  is_day: boolean;
}

/** Each planet its own colour — the ring reads as a sequence of powers,
 *  not a gradient. The tokens are theme-aware. */
export const PLANET_HOUR_COLOR: Record<string, string> = {
  saturn: "var(--pl-sat)",
  jupiter: "var(--pl-jup)",
  mars: "var(--pl-mars)",
  sun: "var(--pl-sun)",
  venus: "var(--pl-venus)",
  mercury: "var(--pl-merc)",
  moon: "var(--pl-moon)",
};

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function PlanetaryHoursRing({
  hours,
  currentIndex,
  now,
  size = 360,
  children,
  style,
}: {
  hours: RingHour[];
  /** The hour in force, when the shown day is today. Null otherwise. */
  currentIndex: number | null;
  /** "Now", for the needle. Null when the shown day is not today. */
  now: Date | null;
  size?: number;
  /** Centre content (glyph, hour name, time left) — HTML, over the SVG. */
  children?: ReactNode;
  style?: CSSProperties;
}) {
  if (hours.length === 0) return null;

  const c = size / 2;
  const outer = c - 4;
  const width = outer * 0.3;
  const radius = outer - width / 2;

  const first = hours[0] as RingHour;
  const last = hours[hours.length - 1] as RingHour;
  const from = new Date(first.start).getTime();
  const total = new Date(last.end).getTime() - from;
  if (total <= 0) return null;

  // Sunrise at the top, the day turning clockwise from it — which is how
  // the planetary day itself runs.
  const angleOf = (iso: string | number): number =>
    -Math.PI / 2 +
    2 * Math.PI * (((typeof iso === "number" ? iso : new Date(iso).getTime()) - from) / total);

  // A hairline between segments, so twenty-four read as twenty-four.
  const gap = 0.008;

  const dusk = hours.find((h) => !h.is_day) ?? null;
  const nowMs = now?.getTime() ?? null;
  const needleAngle =
    nowMs !== null && nowMs >= from && nowMs < new Date(last.end).getTime() ? angleOf(nowMs) : null;

  return (
    <div style={{ position: "relative", width: size, height: size, ...style }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="The twenty-four planetary hours, drawn to scale"
      >
        {hours.map((h) => {
          const a0 = angleOf(h.start);
          const a1 = angleOf(h.end) - gap;
          if (a1 <= a0) return null;
          const isNow = currentIndex !== null && h.index === currentIndex;
          const thickness = (h.is_day ? width : width * 0.62) * (isNow ? 1.28 : 1);
          const colour = PLANET_HOUR_COLOR[h.ruler] ?? "var(--ink-mute)";
          return (
            <g key={h.index}>
              <path
                d={arcPath(c, c, radius, a0, a1)}
                fill="none"
                stroke={colour}
                strokeWidth={thickness}
                opacity={isNow ? 1 : h.is_day ? 0.55 : 0.28}
              />
              {isNow
                ? [-1, 1].map((edge) => (
                    // A pale rim on both edges, so the hour in force reads as
                    // lit rather than merely as a stronger colour.
                    <path
                      key={edge}
                      d={arcPath(c, c, radius + edge * (thickness / 2 + 1.5), a0, a1)}
                      fill="none"
                      stroke="var(--ink)"
                      strokeWidth={1.5}
                      opacity={0.55}
                    />
                  ))
                : null}
            </g>
          );
        })}

        {/* Where the day turns from light to dark, and back. */}
        {dusk
          ? [first.start, dusk.start].map((at) => {
              const a = angleOf(at);
              const [x0, y0] = polar(c, c, radius - width, a);
              const [x1, y1] = polar(c, c, radius + width, a);
              return (
                <line
                  key={at}
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke="var(--line-2)"
                  strokeWidth={1}
                />
              );
            })
          : null}

        {/* The needle: where the moment stands in the day. */}
        {needleAngle !== null
          ? (() => {
              const [x0, y0] = polar(c, c, radius - width, needleAngle);
              const [x1, y1] = polar(c, c, radius + width, needleAngle);
              return (
                <line
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke="var(--ink)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })()
          : null}
      </svg>

      {/* Inside the ring, not under it: the middle is where the eye lands. */}
      <div
        style={{
          position: "absolute",
          inset: width + 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
