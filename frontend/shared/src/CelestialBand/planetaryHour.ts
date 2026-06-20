/**
 * Planetary-hour calculation.
 *
 * The traditional system divides each day into 24 unequal "hours" — 12
 * between sunrise and sunset (day-hours), 12 between sunset and the next
 * sunrise (night-hours). Each is ruled by one of the seven classical
 * planets.
 *
 * Day-ruler mapping (the day's first hour is ruled by the day's planet):
 *   Sunday    — Sun
 *   Monday    — Moon
 *   Tuesday   — Mars
 *   Wednesday — Mercury
 *   Thursday  — Jupiter
 *   Friday    — Venus
 *   Saturday  — Saturn
 *
 * Within the day, hours cycle through the Chaldean order:
 *   Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → (repeat)
 *
 * The 25th hour (i.e. the first hour of the next day) lands naturally on
 * the next day-ruler — this is the structural reason the seven-day week
 * is in that order.
 */

export type Planet = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

/** Chaldean order — descending classical-distance order. */
const CHALDEAN: Planet[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];

/** Day rulers, indexed by ``Date.getDay()`` (0 = Sunday). */
const DAY_RULERS: Planet[] = [
  "sun", // Sunday
  "moon", // Monday
  "mars", // Tuesday
  "mercury", // Wednesday
  "jupiter", // Thursday
  "venus", // Friday
  "saturn", // Saturday
];

export interface PlanetaryHourInput {
  /** Local civil time being queried. */
  now: Date;
  /** Today's sunrise (any tz; same Date as ``now`` for the comparison). */
  sunrise: Date;
  /** Today's sunset. */
  sunset: Date;
  /** Tomorrow's sunrise. Needed for the night-hour band. */
  nextSunrise: Date;
}

export interface PlanetaryHour {
  /** Which planet rules the current hour. */
  ruler: Planet;
  /** 1-based index within the current band (1..12). */
  indexInBand: number;
  /** ``"day"`` (between sunrise + sunset) or ``"night"``. */
  band: "day" | "night";
  /** Approximate start of the current planetary hour. */
  startsAt: Date;
  /** Approximate end (start of the next planetary hour). */
  endsAt: Date;
  /** Day-ruler — useful for surfaces that want to show "today is Mars's day". */
  dayRuler: Planet;
}

function chaldeanIndexOf(planet: Planet): number {
  const i = CHALDEAN.indexOf(planet);
  if (i < 0) throw new Error(`Unknown planet: ${planet}`);
  return i;
}

/** The ruler N hours after the supplied starting ruler (wraps the 7-cycle). */
function rulerAtOffset(start: Planet, offset: number): Planet {
  const base = chaldeanIndexOf(start);
  const idx = (((base + offset) % CHALDEAN.length) + CHALDEAN.length) % CHALDEAN.length;
  return CHALDEAN[idx] as Planet;
}

/**
 * Compute the planetary hour currently in effect.
 *
 * The algorithm:
 *   1. Determine the day-ruler (from the weekday of the *day* that started
 *      at the most recent sunrise — or the previous day if it's still
 *      before sunrise).
 *   2. Compute day-hour length and night-hour length from the supplied
 *      sunrise/sunset/next-sunrise.
 *   3. Position the current time into a band + index.
 *   4. The ruler is ``dayRuler`` offset by N in the Chaldean cycle.
 */
export function planetaryHour(input: PlanetaryHourInput): PlanetaryHour {
  const { now, sunrise, sunset, nextSunrise } = input;

  // Before sunrise, the active "day" started yesterday. After sunset, it
  // started today. The mapping picks the right day-ruler accordingly.
  const beforeSunrise = now.getTime() < sunrise.getTime();
  const dayStart = beforeSunrise ? new Date(sunrise.getTime() - 24 * 60 * 60 * 1000) : sunrise;
  const dayRuler = DAY_RULERS[dayStart.getDay()] as Planet;

  const dayLengthMs = sunset.getTime() - sunrise.getTime();
  const nightLengthMs = nextSunrise.getTime() - sunset.getTime();
  const dayHourMs = dayLengthMs / 12;
  const nightHourMs = nightLengthMs / 12;

  const nowMs = now.getTime();
  const isDayBand = nowMs >= sunrise.getTime() && nowMs < sunset.getTime();
  const isNightBand = nowMs >= sunset.getTime() && nowMs < nextSunrise.getTime();

  if (isDayBand) {
    const offset = Math.floor((nowMs - sunrise.getTime()) / dayHourMs);
    const indexInBand = offset + 1;
    const ruler = rulerAtOffset(dayRuler, offset);
    const startsAt = new Date(sunrise.getTime() + offset * dayHourMs);
    const endsAt = new Date(startsAt.getTime() + dayHourMs);
    return { ruler, indexInBand, band: "day", startsAt, endsAt, dayRuler };
  }

  if (isNightBand) {
    const offset = Math.floor((nowMs - sunset.getTime()) / nightHourMs);
    const indexInBand = offset + 1;
    // First night hour = day-hour 13. Continue the Chaldean cycle from there.
    const ruler = rulerAtOffset(dayRuler, 12 + offset);
    const startsAt = new Date(sunset.getTime() + offset * nightHourMs);
    const endsAt = new Date(startsAt.getTime() + nightHourMs);
    return { ruler, indexInBand, band: "night", startsAt, endsAt, dayRuler };
  }

  // Edge case: ``now`` is before sunrise of the same day. Treat as the
  // final night-hour of the previous day (offset 11). Recompute against
  // the previous day's sunset → today's sunrise band.
  const prevSunset = new Date(sunset.getTime() - 24 * 60 * 60 * 1000);
  const prevNightMs = sunrise.getTime() - prevSunset.getTime();
  const prevNightHourMs = prevNightMs / 12;
  const offset = Math.floor((nowMs - prevSunset.getTime()) / prevNightHourMs);
  const indexInBand = Math.min(12, Math.max(1, offset + 1));
  const yesterdayRuler = DAY_RULERS[dayStart.getDay()] as Planet;
  const ruler = rulerAtOffset(yesterdayRuler, 12 + offset);
  const startsAt = new Date(prevSunset.getTime() + offset * prevNightHourMs);
  const endsAt = new Date(startsAt.getTime() + prevNightHourMs);
  return { ruler, indexInBand, band: "night", startsAt, endsAt, dayRuler };
}
