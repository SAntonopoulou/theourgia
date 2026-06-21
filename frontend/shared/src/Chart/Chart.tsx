/**
 * Chart — SVG natal/event chart wheel.
 *
 * Consumes the response shape of ``GET /api/v1/astro/chart``: an
 * outer zodiac ring (12 segments × 30°), an inner house ring (12
 * cusps offset by the Ascendant), planet glyphs ringed inside, and
 * aspect lines connecting bodies across the center.
 *
 * Accessibility:
 * - The SVG carries a ``role="img"`` and a structured ``<title>`` +
 *   ``<desc>`` so screen readers announce the chart's identity and
 *   summary.
 * - Each placement is a ``<g>`` with its own descriptive title.
 * - The companion ``ChartLegend`` (sibling component) gives the
 *   tabular fallback for users who can't or don't want to read SVG.
 *
 * Multi-tradition styling: the chart inherits from the surrounding
 * ``data-theme`` / ``data-mode``. The zodiac ring uses the design's
 * accent and ink tokens; aspect colours are derived from the
 * standard astrological palette (red = hard, blue = soft) but
 * dimmed against the parchment / vellum surface.
 *
 * **Attribution**: the Swiss Ephemeris + JPL DE441 credit is
 * rendered in the SVG footer per the AGPL-3.0 license obligations.
 */

import type { CSSProperties } from "react";

export interface ChartPlacement {
  body_id: string;
  body_name: string;
  glyph: string;
  tropical_longitude: number;
  tropical_sign: string;
  house: number;
  is_retrograde: boolean;
}

export interface ChartHouses {
  cusps: number[]; // length 12: cusps[0] = house 1, cusps[11] = house 12
  ascendant: number;
  midheaven: number;
}

export interface ChartAspect {
  body_a: string;
  body_b: string;
  kind: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
}

export interface ChartProps {
  /** Placements (planets, asteroids, etc.). */
  placements: ChartPlacement[];
  /** House cusps + angles. */
  houses: ChartHouses;
  /** Detected aspects. Drawn as connecting lines if ``showAspects``. */
  aspects: ChartAspect[];
  /** ARIA-accessible chart title (the natal name / event label). */
  title: string;
  /** ARIA-accessible description (1-2 sentences). */
  description?: string;
  /** Render aspect lines. Default true. */
  showAspects?: boolean;
  /** Render house cusp lines. Default true. */
  showHouses?: boolean;
  /** Pixel size of the rendered SVG. Default 480. */
  size?: number;
  /** Swiss Ephemeris attribution string (carried in the SVG footer). */
  attribution?: string;
  className?: string;
  style?: CSSProperties;
}

const SIGN_GLYPHS = [
  "♈", "♉", "♊", "♋", "♌", "♍",
  "♎", "♏", "♐", "♑", "♒", "♓",
] as const;

const ASPECT_COLOR: Record<ChartAspect["kind"], string> = {
  conjunction: "var(--ink-soft)",
  sextile: "var(--info, #5e9ba6)",
  square: "var(--danger, #b5573f)",
  trine: "var(--success, #6ba892)",
  opposition: "var(--danger, #b5573f)",
};

const ASPECT_DASH: Record<ChartAspect["kind"], string> = {
  conjunction: "0",
  sextile: "3 3",
  square: "0",
  trine: "0",
  opposition: "0",
};

const ASPECT_OPACITY: Record<ChartAspect["kind"], number> = {
  conjunction: 0.5,
  sextile: 0.6,
  square: 0.7,
  trine: 0.6,
  opposition: 0.7,
};

/**
 * Convert an ecliptic longitude (0..360°, Aries 0° at the East) to
 * an SVG point on a circle of given radius. The chart convention
 * places **0° Aries at the 9 o'clock** position (the traditional
 * Ascendant location for natal charts cast facing south) — but we
 * follow the more common modern UI convention of **placing the
 * Ascendant at the 9 o'clock position**, which means the zodiac
 * ring is offset by the Ascendant's longitude.
 *
 * For this simplified renderer (no rotation), we place 0° Aries at
 * the right (3 o'clock) and proceed counter-clockwise — the
 * astronomical convention. The astrologer's-eye-view rotation
 * lands as a follow-up when the chart UI gets its design pass.
 */
function polarToCartesian(
  longitude: number,
  radius: number,
  center: number,
): { x: number; y: number } {
  // SVG y-axis is inverted; we negate sin to get counter-clockwise motion.
  const rad = ((longitude - 0) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(rad),
    y: center - radius * Math.sin(rad),
  };
}

export function Chart({
  placements,
  houses,
  aspects,
  title,
  description,
  showAspects = true,
  showHouses = true,
  size = 480,
  attribution,
  className,
  style,
}: ChartProps) {
  const center = size / 2;
  const outerRadius = size * 0.46;
  const zodiacInnerRadius = size * 0.36;
  const houseRadius = size * 0.34;
  const planetRadius = size * 0.28;
  const aspectRadius = size * 0.24;

  return (
    <svg
      role="img"
      viewBox={`0 0 ${size} ${size + 30}`}
      width={size}
      height={size + 30}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {description ? <desc>{description}</desc> : null}

      {/* — Outer ring — */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth="1"
      />
      <circle
        cx={center}
        cy={center}
        r={zodiacInnerRadius}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth="1"
      />

      {/* — Zodiac sign divisions (12 spokes at 30° intervals) — */}
      {Array.from({ length: 12 }, (_, i) => {
        const lon = i * 30;
        const start = polarToCartesian(lon, zodiacInnerRadius, center);
        const end = polarToCartesian(lon, outerRadius, center);
        return (
          <line
            key={`zodiac-spoke-${i}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="var(--line)"
            strokeWidth="0.5"
            aria-hidden="true"
          />
        );
      })}

      {/* — Sign glyphs in the zodiac ring — */}
      {SIGN_GLYPHS.map((glyph, i) => {
        const lon = i * 30 + 15;
        const { x, y } = polarToCartesian(
          lon,
          (outerRadius + zodiacInnerRadius) / 2,
          center,
        );
        return (
          <text
            key={`sign-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-glyph, serif)"
            fontSize={size * 0.04}
            fill="var(--accent)"
            aria-hidden="true"
          >
            {glyph}
          </text>
        );
      })}

      {/* — House cusps (12 lines) — */}
      {showHouses
        ? houses.cusps.map((cusp, i) => {
            const start = polarToCartesian(cusp, 0, center);
            const end = polarToCartesian(cusp, houseRadius, center);
            const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
            return (
              <line
                key={`house-cusp-${i}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={isAngle ? "var(--accent)" : "var(--line-2)"}
                strokeWidth={isAngle ? 1.5 : 0.5}
                strokeOpacity={isAngle ? 0.9 : 0.4}
                aria-hidden="true"
              />
            );
          })
        : null}

      {/* — Aspect lines — */}
      {showAspects ? (
        <g aria-hidden="true">
          {aspects.map((aspect, i) => {
            const a = placements.find((p) => p.body_id === aspect.body_a);
            const b = placements.find((p) => p.body_id === aspect.body_b);
            if (!a || !b) return null;
            const pa = polarToCartesian(a.tropical_longitude, aspectRadius, center);
            const pb = polarToCartesian(b.tropical_longitude, aspectRadius, center);
            return (
              <line
                key={`aspect-${i}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={ASPECT_COLOR[aspect.kind]}
                strokeWidth="1"
                strokeDasharray={ASPECT_DASH[aspect.kind]}
                strokeOpacity={ASPECT_OPACITY[aspect.kind]}
              />
            );
          })}
        </g>
      ) : null}

      {/* — Planet glyphs — */}
      {placements.map((p) => {
        const { x, y } = polarToCartesian(p.tropical_longitude, planetRadius, center);
        const degreeText = `${Math.floor(p.tropical_longitude % 30)}°`;
        const summary = `${p.body_name}${p.is_retrograde ? " (retrograde)" : ""} at ${degreeText} ${p.tropical_sign}, house ${p.house}`;
        return (
          <g key={p.body_id} role="group">
            <title>{summary}</title>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-glyph, serif)"
              fontSize={size * 0.045}
              fill="var(--ink)"
            >
              {p.glyph}
            </text>
            {p.is_retrograde ? (
              <text
                x={x + size * 0.022}
                y={y + size * 0.025}
                textAnchor="start"
                fontFamily="var(--font-ui)"
                fontSize={size * 0.018}
                fill="var(--ink-mute)"
                aria-hidden="true"
              >
                ℞
              </text>
            ) : null}
          </g>
        );
      })}

      {/* — Ascendant / Midheaven labels — */}
      <g aria-hidden="true">
        {(() => {
          const asc = polarToCartesian(houses.ascendant, outerRadius + size * 0.02, center);
          const mc = polarToCartesian(houses.midheaven, outerRadius + size * 0.02, center);
          return (
            <>
              <text
                x={asc.x}
                y={asc.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-ui)"
                fontSize={size * 0.022}
                fontWeight={700}
                fill="var(--accent)"
              >
                ASC
              </text>
              <text
                x={mc.x}
                y={mc.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-ui)"
                fontSize={size * 0.022}
                fontWeight={700}
                fill="var(--accent)"
              >
                MC
              </text>
            </>
          );
        })()}
      </g>

      {/* — Attribution footer (mandatory per Swiss Ephemeris license) — */}
      {attribution ? (
        <g>
          <title>{attribution}</title>
          <text
            x={center}
            y={size + 18}
            textAnchor="middle"
            fontFamily="var(--font-ui)"
            fontSize={size * 0.022}
            fill="var(--ink-mute)"
          >
            Swiss Ephemeris · JPL DE441
          </text>
        </g>
      ) : null}
    </svg>
  );
}
