/**
 * Chart presentation helpers — formatting only, no doctrine.
 *
 * The traditional judgment (sect, lots, essential dignities) is computed by
 * the backend's hellenistic engine and served by ``GET /astro/chart/doctrine``
 * under the practitioner's own ``astro.doctrine`` choices — #126 retired the
 * client-side derivation this file descends from, along with its known
 * sect-from-house-numbers approximation. What stays here is arithmetic with a
 * single uncontested answer (antiscia reflections, house quarters, which house
 * a longitude falls in) and pure display work: sign names and glyphs, degree
 * formatting, planet labels.
 */

import type { ChartAspectRead } from "../api/types.js";

// ─── signs ──────────────────────────────────────────────────────────

export const DOCTRINE_SIGNS = [
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

const SIGN_GLYPHS = [
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",
] as const;

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function signIndexOf(longitude: number): number {
  return Math.floor(normalizeLongitude(longitude) / 30);
}

export function degreeInSign(longitude: number): number {
  return normalizeLongitude(longitude) % 30;
}

export function signGlyphOf(longitude: number): string {
  return SIGN_GLYPHS[signIndexOf(longitude)] ?? "";
}

export function signNameOf(longitude: number): string {
  return DOCTRINE_SIGNS[signIndexOf(longitude)] ?? "";
}

/** A degree within its sign, as "12°34'". */
export function formatDegInSign(longitude: number): string {
  const d = degreeInSign(longitude);
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}

// ─── the seven, keyed as the response keys them ─────────────────────

/** The seven classical planets, by the response's lowercase `body_id`. */
export const TRADITIONAL_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
] as const;

export type TraditionalPlanet = (typeof TRADITIONAL_PLANETS)[number];

const PLANET_LABELS: Record<TraditionalPlanet, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

const PLANET_GLYPHS: Record<TraditionalPlanet, string> = {
  saturn: "♄",
  jupiter: "♃",
  mars: "♂",
  sun: "☉",
  venus: "♀",
  mercury: "☿",
  moon: "☽",
};

export function planetLabel(p: TraditionalPlanet): string {
  return PLANET_LABELS[p];
}

export function planetGlyph(p: TraditionalPlanet): string {
  return PLANET_GLYPHS[p];
}

/** The `body_id` as a traditional planet, or null for anything else. */
export function asTraditional(bodyId: string): TraditionalPlanet | null {
  return (TRADITIONAL_PLANETS as readonly string[]).includes(bodyId)
    ? (bodyId as TraditionalPlanet)
    : null;
}

// ─── antiscia ───────────────────────────────────────────────────────

/** The antiscion — the reflection across the Cancer–Capricorn solstitial axis. */
export function antiscion(longitude: number): number {
  return normalizeLongitude(180 - longitude);
}

/** The contra-antiscion — the reflection across the Aries–Libra equinoctial axis. */
export function contraAntiscion(longitude: number): number {
  return normalizeLongitude(360 - longitude);
}

// ─── houses ─────────────────────────────────────────────────────────

export type HouseQuarter = "angular" | "succedent" | "cadent";

/** Angular (1,4,7,10), succedent (2,5,8,11), or cadent (3,6,9,12). */
export function houseQuarter(house: number): HouseQuarter {
  const m = (((house - 1) % 3) + 3) % 3;
  return m === 0 ? "angular" : m === 1 ? "succedent" : "cadent";
}

/** True when [lon] falls in the arc from [start] to [end], the short way round. */
function arcContains(start: number, end: number, lon: number): boolean {
  const span = normalizeLongitude(end - start);
  const into = normalizeLongitude(lon - start);
  // A zero span (degenerate cusp) can't contain anything but its own point.
  return span === 0 ? into === 0 : into < span;
}

/** The house (1–12) a longitude falls in, from the twelve cusps. */
export function houseOfLongitude(longitude: number, cusps: number[]): number {
  if (cusps.length < 12) return 1;
  const lon = normalizeLongitude(longitude);
  for (let i = 0; i < 12; i += 1) {
    const start = cusps[i] as number;
    const end = cusps[(i + 1) % 12] as number;
    if (arcContains(start, end, lon)) return i + 1;
  }
  return 1;
}

// ─── aspects ────────────────────────────────────────────────────────

export const ASPECT_GLYPHS: Record<ChartAspectRead["kind"], string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};

/** The aspect between two bodies, in either order, or null. */
export function aspectBetween(
  aspects: readonly ChartAspectRead[],
  a: string,
  b: string,
): ChartAspectRead | null {
  return (
    aspects.find((x) => (x.body_a === a && x.body_b === b) || (x.body_a === b && x.body_b === a)) ??
    null
  );
}

// ─── points on the wheel, formatted for display ─────────────────────

/** A longitude dressed for display: sign, glyph, formatted degree, house. */
export interface DoctrinePoint {
  longitude: number;
  sign: string;
  signGlyph: string;
  degIn: string;
  house: number;
}

export function pointAt(longitude: number, cusps: number[]): DoctrinePoint {
  return {
    longitude,
    sign: signNameOf(longitude),
    signGlyph: signGlyphOf(longitude),
    degIn: formatDegInSign(longitude),
    house: houseOfLongitude(longitude, cusps),
  };
}
