/**
 * Where the moon is on its day-arc, for MoonArcDiagram — the lunar
 * counterpart of the daylight fraction the sun's course is drawn from.
 *
 * The moon's time above the horizon straddles midnight far more often than the
 * sun's, so the rise that began the current pass and the set that will end it
 * can fall on different civil days. This looks across yesterday/today/tomorrow
 * for the rise most recently before now and the set next after it, and reads
 * the fraction between them. `isUp` is taken from the moon's actual altitude, so
 * it is right even when the rise/set times are ambiguous (polar-ish latitudes,
 * a moon that is always up that day).
 */

import SunCalc from "suncalc";

export interface MoonArc {
  /** 0..1 through the current pass above the horizon; -1 when the moon is down. */
  aboveFraction: number;
  isUp: boolean;
}

export interface SunArc {
  /** 0..1 through daylight (sunrise → sunset); -1 at polar night. */
  daylightFraction: number;
  isDay: boolean;
}

/** Where the sun is on its day-arc — the fraction SunArcDiagram is drawn from.
 *  Simpler than the moon: sunrise and sunset are the same civil day except at
 *  the poles, where it falls back to the sun's actual altitude. */
export function sunArc(now: Date, lat: number, lng: number): SunArc {
  const times = SunCalc.getTimes(now, lat, lng);
  const rise = times.sunrise?.getTime();
  const set = times.sunset?.getTime();
  const t = now.getTime();
  if (rise == null || set == null || Number.isNaN(rise) || Number.isNaN(set) || set <= rise) {
    const up = SunCalc.getPosition(now, lat, lng).altitude > 0;
    return { daylightFraction: up ? 0.5 : -1, isDay: up };
  }
  return { daylightFraction: (t - rise) / (set - rise), isDay: t >= rise && t <= set };
}

export function moonArc(now: Date, lat: number, lng: number): MoonArc {
  const isUp = SunCalc.getMoonPosition(now, lat, lng).altitude > 0;
  if (!isUp) return { aboveFraction: -1, isUp: false };

  const t = now.getTime();
  const rises: number[] = [];
  const sets: number[] = [];
  for (const offset of [-1, 0, 1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const times = SunCalc.getMoonTimes(day, lat, lng);
    if (times.rise) rises.push(times.rise.getTime());
    if (times.set) sets.push(times.set.getTime());
  }

  const risesBefore = rises.filter((r) => r <= t);
  const setsAfter = sets.filter((s) => s >= t);
  if (risesBefore.length === 0 || setsAfter.length === 0) {
    // Up, but the boundary times are unclear (e.g. always-up that day) — sit it
    // at culmination rather than guessing an edge.
    return { aboveFraction: 0.5, isUp: true };
  }
  const lastRise = Math.max(...risesBefore);
  const nextSet = Math.min(...setsAfter);
  if (nextSet <= lastRise) return { aboveFraction: 0.5, isUp: true };
  return { aboveFraction: (t - lastRise) / (nextSet - lastRise), isUp: true };
}
