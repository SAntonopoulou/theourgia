/**
 * useCelestial — bundled current-time celestial state for a given location.
 *
 * Returns the data used by both the legacy CelestialBand and the design's
 * three Today-page cards (Planetary hour, Lunar phase, Transits). All
 * computation centralised here so callers can render the layout they want
 * without re-wiring SunCalc + the planetary-hour algorithm.
 *
 * Self-ticking: a tick every ``refreshMs`` (default 60s) re-reads
 * ``new Date()`` and re-computes. Pass ``now`` to override (tests,
 * time-travel UI).
 */

import { useEffect, useMemo, useState } from "react";
import SunCalc from "suncalc";

import { lunarPhaseLabel, lunarPhaseName, type LunarPhaseName } from "../CelestialBand/lunarPhase.js";
import { planetaryHour, type Planet, type PlanetaryHour } from "../CelestialBand/planetaryHour.js";

export interface UseCelestialInput {
  lat: number;
  lng: number;
  /** Override "now". Default ``new Date()``. */
  now?: Date;
  /** ms between auto-updates. Default 60000. Pass null to disable. */
  refreshMs?: number | null;
}

/** Zodiac signs in order, starting at 0° Aries. */
export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

const ZODIAC_NAMES: ZodiacSign[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/** Unicode zodiac glyphs aligned to ``ZODIAC_NAMES`` order. */
export const ZODIAC_GLYPH: Record<ZodiacSign, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export interface CelestialState {
  /** The wall-clock instant this snapshot was computed at. */
  now: Date;
  /** Today's sunrise (in local civil time). */
  sunrise: Date;
  /** Today's sunset. */
  sunset: Date;
  /** Active planetary hour. */
  planetary: PlanetaryHour;
  /** Progress through the current planetary hour as a 0..1 fraction. */
  hourProgress: number;
  /** ms remaining in the current planetary hour. */
  hourRemainingMs: number;
  /** The planet ruling the next hour after the current one. */
  nextRuler: Planet;
  /** suncalc moon-illumination fraction (0..1). */
  lunarFraction: number;
  /** Phase fraction (0 = new, 0.5 = full). */
  lunarPhase: number;
  /** Bucketed phase name. */
  lunarPhaseName: LunarPhaseName;
  /** Human label, e.g. "Waxing Gibbous". */
  lunarPhaseLabel: string;
  /** Day-night progress 0..1; 0 before sunrise, 1 after sunset. */
  dayNightProgress: number;
  /** Zodiac sign currently transited by the moon (approximate, see note). */
  lunarSign: ZodiacSign;
}

const CHALDEAN: Planet[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];

function nextRulerOf(current: Planet): Planet {
  const i = CHALDEAN.indexOf(current);
  const next = CHALDEAN[(i + 1) % CHALDEAN.length];
  return next as Planet;
}

/**
 * Approximate the moon's ecliptic longitude (degrees) at a given instant.
 *
 * Uses a low-order series — enough to land in the right zodiac sign on most
 * days. Pulled from Meeus, *Astronomical Algorithms*, simplified for the
 * "Moon in [Sign]" display affordance. Replace with the full ephemeris
 * engine when ``transitsOfNote`` lands (see agent_data_and_components §10).
 */
function moonEclipticLongitude(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545.0) / 36_525;
  const deg2rad = Math.PI / 180;

  // Moon's mean longitude.
  const L =
    218.3164477 + 481_267.88123421 * t - 0.0015786 * t * t + (t * t * t) / 538_841;
  // Moon's mean elongation.
  const D =
    297.8501921 + 445_267.1114034 * t - 0.0018819 * t * t + (t * t * t) / 545_868;
  // Sun's mean anomaly.
  const M = 357.5291092 + 35_999.0502909 * t - 0.0001536 * t * t + (t * t * t) / 24_490_000;
  // Moon's mean anomaly.
  const Mp =
    134.9633964 +
    477_198.8675055 * t +
    0.0087414 * t * t +
    (t * t * t) / 69_699 -
    (t * t * t * t) / 14_712_000;

  // Five largest periodic terms in lunar longitude (sufficient for sign-bucket display).
  const corr =
    6.288774 * Math.sin(Mp * deg2rad) +
    1.274027 * Math.sin((2 * D - Mp) * deg2rad) +
    0.658314 * Math.sin(2 * D * deg2rad) +
    0.213618 * Math.sin(2 * Mp * deg2rad) -
    0.185116 * Math.sin(M * deg2rad);

  let lon = L + corr;
  lon = ((lon % 360) + 360) % 360;
  return lon;
}

function zodiacSignOf(longitudeDeg: number): ZodiacSign {
  const idx = Math.floor(((longitudeDeg % 360) + 360) % 360 / 30) % 12;
  return ZODIAC_NAMES[idx] as ZodiacSign;
}

export function useCelestial({
  lat,
  lng,
  now,
  refreshMs = 60_000,
}: UseCelestialInput): CelestialState {
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

  return useMemo<CelestialState>(() => {
    const today = tick;
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayTimes = SunCalc.getTimes(today, lat, lng);
    const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lng);

    const planetary = planetaryHour({
      now: today,
      sunrise: todayTimes.sunrise,
      sunset: todayTimes.sunset,
      nextSunrise: tomorrowTimes.sunrise,
    });

    const hourSpan = planetary.endsAt.getTime() - planetary.startsAt.getTime();
    const hourElapsed = today.getTime() - planetary.startsAt.getTime();
    const hourProgress = hourSpan > 0 ? Math.max(0, Math.min(1, hourElapsed / hourSpan)) : 0;
    const hourRemainingMs = Math.max(0, planetary.endsAt.getTime() - today.getTime());

    const moon = SunCalc.getMoonIllumination(today);

    const sunriseMs = todayTimes.sunrise.getTime();
    const sunsetMs = todayTimes.sunset.getTime();
    const span = sunsetMs - sunriseMs;
    const nowMs = today.getTime();
    const dayNightProgress = (() => {
      if (nowMs < sunriseMs) return 0;
      if (nowMs >= sunsetMs) return 1;
      return span > 0 ? (nowMs - sunriseMs) / span : 0;
    })();

    const lunarSign = zodiacSignOf(moonEclipticLongitude(today));

    return {
      now: today,
      sunrise: todayTimes.sunrise,
      sunset: todayTimes.sunset,
      planetary,
      hourProgress,
      hourRemainingMs,
      nextRuler: nextRulerOf(planetary.ruler),
      lunarFraction: moon.fraction,
      lunarPhase: moon.phase,
      lunarPhaseName: lunarPhaseName(moon.phase),
      lunarPhaseLabel: lunarPhaseLabel(moon.phase),
      dayNightProgress,
      lunarSign,
    };
  }, [tick, lat, lng]);
}
