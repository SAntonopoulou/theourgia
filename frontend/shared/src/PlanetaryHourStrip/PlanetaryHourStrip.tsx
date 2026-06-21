/**
 * PlanetaryHourStrip — the proportional 24-cell hour strip.
 *
 * Per `Theourgia Planetary Hours.dc.html`. Each cell's flex-grow is
 * its true length in minutes — so the day arc visually dominates in
 * summer, the night arc in winter. Cells carry:
 *   - ordinal number 1..24
 *   - the ruler's glyph in the planet's --pl-* color
 *   - HH:MM start time
 *
 * The NOW marker is a vertical line + dot at the fractional position
 * along the sunrise-anchored 1440-minute timeline. Polar latitudes
 * fall back to even 60-minute hours from local midnight (server
 * decides; this widget renders whatever it's given).
 *
 * Arc labels (Day · sunrise to sunset / Night · sunset to sunrise)
 * widen proportional to their lengths.
 */

import { type CSSProperties } from "react";

export type ClassicalPlanet =
  | "sun"
  | "moon"
  | "merc"
  | "venus"
  | "mars"
  | "jup"
  | "sat";

export interface PlanetMeta {
  name: string;
  glyph: string;
  color: string;
}

export const CLASSICAL_PLANETS: Record<ClassicalPlanet, PlanetMeta> = {
  sun: { name: "Sun", glyph: "☉", color: "var(--pl-sun)" },
  moon: { name: "Moon", glyph: "☽", color: "var(--pl-moon)" },
  merc: { name: "Mercury", glyph: "☿", color: "var(--pl-merc)" },
  venus: { name: "Venus", glyph: "♀", color: "var(--pl-venus)" },
  mars: { name: "Mars", glyph: "♂", color: "var(--pl-mars)" },
  jup: { name: "Jupiter", glyph: "♃", color: "var(--pl-jup)" },
  sat: { name: "Saturn", glyph: "♄", color: "var(--pl-sat)" },
};

export interface PlanetaryHourCell {
  /** 0..23. Ordinal = idx+1. */
  idx: number;
  ruler: ClassicalPlanet;
  /** Whether this cell is in the day arc. */
  isDay: boolean;
  /** Minute-of-day [0..1440). */
  startMin: number;
  /** Length in minutes. */
  lengthMin: number;
}

export interface PlanetaryHourStripProps {
  /** Exactly 24 hours — 12 day + 12 night (or 24 polar). */
  hours: PlanetaryHourCell[];
  /** Total day-arc length in minutes (controls arc-label width). */
  dayLengthMin: number;
  /** Total night-arc length in minutes. */
  nightLengthMin: number;
  /** Current minute-of-day [0..1440). When polar, anchored at 00:00;
   *  otherwise anchored at sunrise. */
  nowMin?: number;
  /** Sunrise minute-of-day; used to anchor the NOW marker fraction. */
  sunriseMin?: number;
  /** Whether to render the NOW marker. */
  showNow?: boolean;
  /** The currently active cell index — `null` means "use the hour
   *  that contains nowMin" (which the parent can also pass explicitly). */
  activeIdx?: number | null;
  onSelect?: (idx: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function formatTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatDuration(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return (h > 0 ? `${h}h ` : "") + `${mm}m`;
}

const arcLabelBase: CSSProperties = {
  padding: "7px 12px",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  display: "flex",
  alignItems: "center",
  gap: 7,
  whiteSpace: "nowrap",
  overflow: "hidden",
};

export function PlanetaryHourStrip({
  hours,
  dayLengthMin,
  nightLengthMin,
  nowMin,
  sunriseMin,
  showNow = true,
  activeIdx,
  onSelect,
  className,
  style,
}: PlanetaryHourStripProps) {
  const safeActive = activeIdx === undefined || activeIdx === null ? -1 : activeIdx;

  // Compute current-hour idx for NOW marker context.
  const nowHourIdx =
    nowMin === undefined
      ? -1
      : hours.findIndex((h) => {
          // Use the sunrise-anchored raw start to detect containment
          // even for cells whose timing crosses midnight.
          const s = h.startMin;
          const e = (h.startMin + h.lengthMin) % 1440;
          if (e > s) return nowMin >= s && nowMin < e;
          // Wraps midnight
          return nowMin >= s || nowMin < e;
        });

  // NOW marker fraction along the strip (sunrise-anchored 1440 minutes).
  const nowFraction =
    nowMin === undefined
      ? 0
      : sunriseMin === undefined
        ? nowMin / 1440
        : (((nowMin - sunriseMin) + 1440) % 1440) / 1440;

  return (
    <div
      className={className}
      data-component="planetary-hour-strip"
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      {/* Arc labels */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            ...arcLabelBase,
            flexGrow: dayLengthMin,
            flexBasis: 0,
            background: "var(--arc-day)",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>
            ☀
          </span>{" "}
          Day · sunrise to sunset
        </div>
        <div
          style={{
            ...arcLabelBase,
            flexGrow: nightLengthMin,
            flexBasis: 0,
            background: "var(--arc-night)",
            borderLeft: "1px solid var(--line)",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>
            ☽
          </span>{" "}
          Night · sunset to sunrise
        </div>
      </div>

      {/* Proportional cells */}
      <div
        style={{
          position: "relative",
          display: "flex",
          height: 108,
        }}
      >
        {hours.map((h) => {
          const meta = CLASSICAL_PLANETS[h.ruler];
          const isActive = h.idx === safeActive;
          const isNow = h.idx === nowHourIdx;
          return (
            <button
              key={h.idx}
              type="button"
              onClick={() => onSelect?.(h.idx)}
              aria-label={
                `Hour ${h.idx + 1}, ${meta.name}, ${formatTime(h.startMin)} to ${formatTime(h.startMin + h.lengthMin)}` +
                (isNow ? ", current hour" : "")
              }
              data-hour-idx={h.idx}
              data-hour-ruler={h.ruler}
              data-hour-is-day={h.isDay ? "true" : "false"}
              data-hour-active={isActive ? "true" : "false"}
              data-hour-now={isNow ? "true" : "false"}
              style={{
                flexGrow: h.lengthMin,
                flexBasis: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 2px",
                borderRight:
                  h.idx < hours.length - 1
                    ? "1px solid var(--line)"
                    : "none",
                background: isActive
                  ? "var(--accent-soft)"
                  : h.isDay
                    ? "var(--arc-day)"
                    : "var(--arc-night)",
                boxShadow: isActive
                  ? "inset 0 0 0 1.5px var(--accent)"
                  : "none",
                cursor: "pointer",
                transition: "background 0.15s ease",
                border: "none",
                color: "var(--ink)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 9.5,
                  color: "var(--ink-mute)",
                }}
              >
                {h.idx + 1}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-glyph)",
                  fontSize: 20,
                  color: meta.color,
                  lineHeight: 1,
                }}
              >
                {meta.glyph}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--ink-mute)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatTime(h.startMin)}
              </span>
            </button>
          );
        })}

        {/* NOW marker */}
        {showNow && nowMin !== undefined ? (
          <>
            <div
              aria-hidden="true"
              data-now-line
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `calc(${nowFraction * 100}% - 1px)`,
                width: 2,
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
            <div
              aria-hidden="true"
              data-now-dot
              style={{
                position: "absolute",
                top: -1,
                left: `calc(${nowFraction * 100}% - 4px)`,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent)",
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
