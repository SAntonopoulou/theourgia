/**
 * CelestialBand — current planetary hour + lunar phase indicator.
 *
 * A horizontal day-night strip with markers for sunrise / noon / sunset
 * and the current time. Sub-labels show:
 *   - the active planetary hour (e.g. "Hour of Mars · 9 of 12 day-hours")
 *   - the lunar phase + illumination percentage
 *   - the date
 *
 * Self-updating: a tick every ``refreshMs`` (default 60s) re-reads
 * ``new Date()`` and re-computes. Pass ``now`` to override (e.g. for
 * tests, playback, time-travel UI).
 */

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import SunCalc from "suncalc";

import { Glyph, type GlyphName } from "../Glyph/index.js";

import { lunarPhaseLabel } from "./lunarPhase.js";
import { type Planet, planetaryHour } from "./planetaryHour.js";

export interface CelestialBandProps {
  /** Latitude in degrees. */
  lat: number;
  /** Longitude in degrees. */
  lng: number;
  /** Override "now". Default ``new Date()``. */
  now?: Date;
  /** ms between auto-updates. Default 60000. Pass null to disable. */
  refreshMs?: number | null;
  /** ``"full"`` (default) or ``"compact"`` (one line for header use). */
  variant?: "full" | "compact";
  className?: string;
  style?: CSSProperties;
}

const PLANET_LABEL: Record<Planet, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
};

/**
 * The engraving sprite doesn't ship dedicated planetary glyphs yet (per
 * the design's known TODO). Until those arrive, map each planet to its
 * closest existing UI glyph so the band has a visible marker.
 */
const PLANET_GLYPH: Record<Planet, GlyphName> = {
  sun: "sun",
  moon: "moon",
  mars: "ritual", // a placeholder until a Mars glyph ships
  mercury: "feather",
  jupiter: "compass",
  venus: "pentacle",
  saturn: "shield",
};

function dateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function CelestialBand({
  lat,
  lng,
  now,
  refreshMs = 60_000,
  variant = "full",
  className,
  style,
}: CelestialBandProps) {
  // Tick: when ``now`` is supplied externally, we follow it; otherwise we
  // self-tick on the supplied refreshMs cadence.
  const [tick, setTick] = useState(() => now ?? new Date());

  useEffect(() => {
    if (now !== undefined) {
      setTick(now);
      return;
    }
    if (refreshMs === null) return;
    const id = setInterval(() => setTick(new Date()), refreshMs);
    return () => clearInterval(id);
  }, [now, refreshMs]);

  const data = useMemo(() => {
    const today = tick;
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayTimes = SunCalc.getTimes(today, lat, lng);
    const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lng);
    const ph = planetaryHour({
      now: today,
      sunrise: todayTimes.sunrise,
      sunset: todayTimes.sunset,
      nextSunrise: tomorrowTimes.sunrise,
    });
    const moon = SunCalc.getMoonIllumination(today);
    return {
      planetary: ph,
      sunrise: todayTimes.sunrise,
      sunset: todayTimes.sunset,
      lunarFraction: moon.fraction,
      lunarPhaseLabel: lunarPhaseLabel(moon.phase),
    };
  }, [tick, lat, lng]);

  const bandStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
    padding: "var(--space-4, 16px) var(--space-5, 24px)",
    backgroundColor: "var(--bg-2)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg, 12px)",
    fontFamily: "var(--font-ui)",
    ...style,
  };

  const compactStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-3, 12px)",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    backgroundColor: "var(--bg-2)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-md, 6px)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--type-ui, 13px)",
    color: "var(--ink-soft)",
    ...style,
  };

  if (variant === "compact") {
    return (
      <div className={className} style={compactStyle} data-celestial-band="compact">
        <span style={{ color: "var(--accent)" }}>
          <Glyph name={PLANET_GLYPH[data.planetary.ruler]} size={14} />
        </span>
        <span>Hour of {PLANET_LABEL[data.planetary.ruler]}</span>
        <span style={{ color: "var(--ink-mute)" }}>·</span>
        <span>{data.lunarPhaseLabel}</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-mute)" }}>
          {Math.round(data.lunarFraction * 100)}%
        </span>
      </div>
    );
  }

  // Full variant: header label + day-night strip + sub-labels.
  // The strip is rendered as a single gradient bar with a current-time
  // marker positioned by percent.
  const dayNightProgress = (() => {
    const ms = tick.getTime();
    const total = data.sunset.getTime() - data.sunrise.getTime();
    if (ms < data.sunrise.getTime()) return 0;
    if (ms >= data.sunset.getTime()) return 1;
    return (ms - data.sunrise.getTime()) / total;
  })();

  return (
    <div className={className} style={bandStyle} data-celestial-band="full">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3, 12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3, 12px)" }}>
          <span
            style={{
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: "var(--accent-soft, var(--bg-3, var(--bg-2)))",
              color: "var(--accent)",
            }}
          >
            <Glyph name={PLANET_GLYPH[data.planetary.ruler]} size={20} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--type-h3, 18px)",
                color: "var(--ink)",
              }}
            >
              Hour of {PLANET_LABEL[data.planetary.ruler]}
            </span>
            <span style={{ fontSize: "var(--type-caption, 11px)", color: "var(--ink-mute)" }}>
              {data.planetary.indexInBand} of 12 {data.planetary.band}-hours · today belongs to{" "}
              {PLANET_LABEL[data.planetary.dayRuler]}
            </span>
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-ui, 12px)",
            color: "var(--ink-mute)",
          }}
        >
          {dateLabel(tick)}
        </span>
      </div>

      {/* Day-night strip: gradient from horizon through midday and back. */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: 14,
          borderRadius: "var(--r-pill, 999px)",
          background:
            "linear-gradient(90deg, var(--bg-sunk, var(--bg)) 0%, var(--accent-soft, var(--bg-3)) 50%, var(--bg-sunk, var(--bg)) 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `calc(${(dayNightProgress * 100).toFixed(2)}% - 1px)`,
            width: 2,
            backgroundColor: "var(--accent)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "var(--type-caption, 11px)",
          color: "var(--ink-mute)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>↑ {timeLabel(data.sunrise)} sunrise</span>
        <span>
          {data.lunarPhaseLabel} · {Math.round(data.lunarFraction * 100)}%
        </span>
        <span>{timeLabel(data.sunset)} sunset ↓</span>
      </div>
    </div>
  );
}
