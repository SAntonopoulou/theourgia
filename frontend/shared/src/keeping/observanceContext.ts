/**
 * Building the sky-context of a keeping, the way the phone captures it.
 *
 * When a practice is kept, the phone snapshots the sky around the moment —
 * moon/sun sign, the planetary hour, the sect, a raw sky reading — and stores
 * it beside the mark (see `ObservanceContext` on the phone, and record_sync's
 * `_wire`/`_apply`). This builds the same shape on the web from the public
 * `/astro/now` and `/astro/planetary-hours` responses, so a web-kept observance
 * carries the same correlations the record exists for. Pure — the fetch lives
 * in the admin data layer; the mapping is tested here.
 */

/** The twelve signs, Aries-first — index is what the observance context stores. */
export const SIGN_NAMES = [
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
] as const;

/** The sign's 0..11 index, or null for an unrecognised name. */
export function signIndex(name: string | undefined): number | null {
  if (!name) return null;
  const i = SIGN_NAMES.indexOf(name as (typeof SIGN_NAMES)[number]);
  return i === -1 ? null : i;
}

/** Only the placement fields the context needs. */
export interface ContextPlacement {
  body_name: string;
  tropical_longitude: number;
  tropical_sign: string;
  house: number;
}

/** Only the hours fields the context needs. */
export interface ContextHours {
  current_hour_index: number | null;
  hours: readonly { index: number; ruler: string; is_day: boolean }[];
}

/** The observance context, field-for-field as record_sync `_apply` reads it. */
export interface ObservanceContext {
  capturedAt: string;
  skyJson: string | null;
  skyFailureReason: string | null;
  weatherJson: string | null;
  /** Non-null by the phone's contract; the web collects no weather. */
  weatherStatus: string;
  weatherProvider: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  moonSignIndex: number | null;
  moonDegreeInSign: number | null;
  sunSignIndex: number | null;
  planetaryHourRuler: string | null;
  dayRuler: string | null;
  sect: string | null;
  moonVoidOfCourse: boolean | null;
}

function placement(placements: readonly ContextPlacement[], body: string): ContextPlacement | undefined {
  return placements.find((p) => p.body_name === body);
}

export interface BuildContextInput {
  capturedAt: string;
  placements: readonly ContextPlacement[];
  hours?: ContextHours | null;
  location: { latitude: number | null; longitude: number | null; label?: string | null };
  /** The raw sky payload to keep opaquely (usually the /astro/now JSON). */
  skyJson?: string | null;
  /** Set when the sky couldn't be read; leaves the projected fields null. */
  skyFailureReason?: string | null;
}

/**
 * Assemble an `ObservanceContext` from a chart + planetary hours + place.
 *
 * - moon/sun sign index and moon degree come from the placements;
 * - the planetary-hour ruler is the current hour's ruler, the day ruler the
 *   first (sunrise) hour's — the traditional rule;
 * - sect is day when the Sun is above the horizon (houses 7–12), else night;
 * - void-of-course is not exposed by the API, so it stays null.
 */
export function buildObservanceContext(input: BuildContextInput): ObservanceContext {
  const { placements, hours, location } = input;
  const moon = placement(placements, "Moon");
  const sun = placement(placements, "Sun");

  const sunHouse = sun?.house ?? null;
  const sect = sunHouse === null ? null : sunHouse >= 7 && sunHouse <= 12 ? "day" : "night";

  let planetaryHourRuler: string | null = null;
  if (hours && hours.current_hour_index !== null) {
    planetaryHourRuler =
      hours.hours.find((h) => h.index === hours.current_hour_index)?.ruler ?? null;
  }
  // The day's ruler is the planet of the sunrise hour — the first day-hour.
  const dayRuler = hours?.hours.find((h) => h.is_day)?.ruler ?? null;

  return {
    capturedAt: input.capturedAt,
    skyJson: input.skyJson ?? null,
    skyFailureReason: input.skyFailureReason ?? null,
    weatherJson: null,
    weatherStatus: "not-collected",
    weatherProvider: null,
    latitude: location.latitude,
    longitude: location.longitude,
    locationLabel: location.label ?? null,
    moonSignIndex: signIndex(moon?.tropical_sign),
    moonDegreeInSign: moon ? ((moon.tropical_longitude % 30) + 30) % 30 : null,
    sunSignIndex: signIndex(sun?.tropical_sign),
    planetaryHourRuler,
    dayRuler,
    sect,
    moonVoidOfCourse: null,
  };
}
