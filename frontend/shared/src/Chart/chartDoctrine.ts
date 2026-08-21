/**
 * Chart doctrine — the traditional reading of a cast chart, derived on the web.
 *
 * The phone's chart shows more than a wheel: the sect of the chart and its
 * light, the Lots of Fortune and Spirit, the essential dignities of each of the
 * seven planets, the antiscia, and which quarter each house falls in. The
 * server returns only positions (`GET /astro/chart`), so — exactly as the phone
 * derives these from the same positions — this module derives them here, from
 * the `ChartResponse` alone. Pure, and tested against the phone's own tables.
 *
 * The tables are a faithful port of the phone's `domain/astrology/dignities.dart`
 * (Egyptian bounds verified by Sophia, Dorothean triplicities, Chaldean faces),
 * its `Lots` (Fortune is the lunar lot, reversed by sect), and its `Sect`/
 * `Nature`. One thing differs and is called out below: the phone reads sect from
 * the Sun's true altitude; the web response carries the Sun's *house* instead,
 * so sect is read from that (houses 7–12 are above the horizon = day), the same
 * approximation the keeping context already uses.
 */

import type { ChartAspectRead, ChartResponse } from "../api/types.js";

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

/** Chaldean order — Saturn outward to the Moon — as the faces and hours walk it. */
const CHALDEAN_ORDER: TraditionalPlanet[] = [
  "saturn",
  "jupiter",
  "mars",
  "sun",
  "venus",
  "mercury",
  "moon",
];

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

function asTraditional(bodyId: string): TraditionalPlanet | null {
  return (TRADITIONAL_PLANETS as readonly string[]).includes(bodyId)
    ? (bodyId as TraditionalPlanet)
    : null;
}

// ─── sect and nature ────────────────────────────────────────────────

export type Sect = "diurnal" | "nocturnal";

/**
 * The sect of the chart from the Sun's house — houses 7–12 stand above the
 * horizon, so a Sun there is a day chart. (The phone uses the Sun's true
 * altitude; the response gives the house instead. The boundary is the same
 * horizon, and this is the approximation the keeping context already uses.)
 * Null when the response carries no Sun to read.
 */
export function sectFromChart(chart: ChartResponse): Sect | null {
  const sun = chart.placements.find((p) => p.body_id === "sun");
  if (!sun) return null;
  return sun.house >= 7 && sun.house <= 12 ? "diurnal" : "nocturnal";
}

/** The luminary of the sect — Sun by day, Moon by night. */
export function sectLight(sect: Sect): TraditionalPlanet {
  return sect === "diurnal" ? "sun" : "moon";
}

/** The benefic of the sect in favour — Jupiter by day, Venus by night. */
export function greaterBenefic(sect: Sect): TraditionalPlanet {
  return sect === "diurnal" ? "jupiter" : "venus";
}

/** The malefic contrary to the sect — the one to keep away from. */
export function worseMalefic(sect: Sect): TraditionalPlanet {
  return sect === "diurnal" ? "mars" : "saturn";
}

// ─── the lots ───────────────────────────────────────────────────────

/**
 * The Lot of Fortune — the Ascendant plus the arc from the Sun to the Moon by
 * day, and from the Moon to the Sun by night. The reversal by sect is what makes
 * Fortune the lunar lot and Spirit the solar one; it is not dropped.
 */
export function lotOfFortune(ascendant: number, sun: number, moon: number, sect: Sect): number {
  return sect === "diurnal"
    ? normalizeLongitude(ascendant + moon - sun)
    : normalizeLongitude(ascendant + sun - moon);
}

/** The Lot of Spirit — the mirror of Fortune. */
export function lotOfSpirit(ascendant: number, sun: number, moon: number, sect: Sect): number {
  return sect === "diurnal"
    ? normalizeLongitude(ascendant + sun - moon)
    : normalizeLongitude(ascendant + moon - sun);
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

// ─── dignity tables (ported from dignities.dart) ────────────────────

/** Element of a sign — fire, earth, air, water by index, as Aries onward. */
export type Element = "Fire" | "Earth" | "Air" | "Water";
const ELEMENTS: Element[] = ["Fire", "Earth", "Air", "Water"];
export function elementOfSignIndex(signIndex: number): Element {
  return ELEMENTS[signIndex % 4] as Element;
}

/** Domicile lords, by sign index — the seven only (Scorpio Mars, Aquarius Saturn). */
const DOMICILE_LORDS: TraditionalPlanet[] = [
  "mars", // Aries
  "venus", // Taurus
  "mercury", // Gemini
  "moon", // Cancer
  "sun", // Leo
  "mercury", // Virgo
  "venus", // Libra
  "mars", // Scorpio
  "jupiter", // Sagittarius
  "saturn", // Capricorn
  "saturn", // Aquarius
  "jupiter", // Pisces
];

/** Exaltation lords, by sign index — signs without an exaltation are null. */
const EXALTATION_LORDS: (TraditionalPlanet | null)[] = [
  "sun", // Aries
  "moon", // Taurus
  null, // Gemini
  "jupiter", // Cancer
  null, // Leo
  "mercury", // Virgo
  "saturn", // Libra
  null, // Scorpio
  null, // Sagittarius
  "mars", // Capricorn
  null, // Aquarius
  "venus", // Pisces
];

/** Dorothean triplicity rulers, by element — day and night ruler. */
const TRIPLICITY: Record<Element, { day: TraditionalPlanet; night: TraditionalPlanet }> = {
  Fire: { day: "sun", night: "jupiter" },
  Earth: { day: "venus", night: "moon" },
  Air: { day: "saturn", night: "mercury" },
  Water: { day: "venus", night: "mars" },
};

interface Bound {
  until: number; // upper limit within the sign, exclusive
  lord: TraditionalPlanet;
}

/** The Egyptian bounds, sign index by sign index. Verified by Sophia. */
const EGYPTIAN_BOUNDS: Bound[][] = [
  // Aries
  [
    { until: 6, lord: "jupiter" },
    { until: 12, lord: "venus" },
    { until: 20, lord: "mercury" },
    { until: 25, lord: "mars" },
    { until: 30, lord: "saturn" },
  ],
  // Taurus
  [
    { until: 8, lord: "venus" },
    { until: 14, lord: "mercury" },
    { until: 22, lord: "jupiter" },
    { until: 27, lord: "saturn" },
    { until: 30, lord: "mars" },
  ],
  // Gemini
  [
    { until: 6, lord: "mercury" },
    { until: 12, lord: "jupiter" },
    { until: 17, lord: "venus" },
    { until: 24, lord: "mars" },
    { until: 30, lord: "saturn" },
  ],
  // Cancer
  [
    { until: 7, lord: "mars" },
    { until: 13, lord: "venus" },
    { until: 19, lord: "mercury" },
    { until: 26, lord: "jupiter" },
    { until: 30, lord: "saturn" },
  ],
  // Leo
  [
    { until: 6, lord: "jupiter" },
    { until: 11, lord: "venus" },
    { until: 18, lord: "saturn" },
    { until: 24, lord: "mercury" },
    { until: 30, lord: "mars" },
  ],
  // Virgo
  [
    { until: 7, lord: "mercury" },
    { until: 17, lord: "venus" },
    { until: 21, lord: "jupiter" },
    { until: 28, lord: "mars" },
    { until: 30, lord: "saturn" },
  ],
  // Libra
  [
    { until: 6, lord: "saturn" },
    { until: 14, lord: "mercury" },
    { until: 21, lord: "jupiter" },
    { until: 28, lord: "venus" },
    { until: 30, lord: "mars" },
  ],
  // Scorpio
  [
    { until: 7, lord: "mars" },
    { until: 11, lord: "venus" },
    { until: 19, lord: "mercury" },
    { until: 24, lord: "jupiter" },
    { until: 30, lord: "saturn" },
  ],
  // Sagittarius
  [
    { until: 12, lord: "jupiter" },
    { until: 17, lord: "venus" },
    { until: 21, lord: "mercury" },
    { until: 26, lord: "saturn" },
    { until: 30, lord: "mars" },
  ],
  // Capricorn
  [
    { until: 7, lord: "mercury" },
    { until: 14, lord: "jupiter" },
    { until: 22, lord: "venus" },
    { until: 26, lord: "saturn" },
    { until: 30, lord: "mars" },
  ],
  // Aquarius
  [
    { until: 7, lord: "mercury" },
    { until: 13, lord: "venus" },
    { until: 20, lord: "jupiter" },
    { until: 25, lord: "mars" },
    { until: 30, lord: "saturn" },
  ],
  // Pisces
  [
    { until: 12, lord: "venus" },
    { until: 16, lord: "jupiter" },
    { until: 19, lord: "mercury" },
    { until: 28, lord: "mars" },
    { until: 30, lord: "saturn" },
  ],
];

function boundLordOf(signIndex: number, degIn: number): TraditionalPlanet {
  const bounds = EGYPTIAN_BOUNDS[signIndex] ?? [];
  for (const b of bounds) {
    if (degIn < b.until) return b.lord;
  }
  return bounds[bounds.length - 1]?.lord ?? "saturn";
}

/** Chaldean faces: the thirty-six decans walk Chaldean order from Mars at 0° Aries. */
function decanLordOf(signIndex: number, degIn: number): TraditionalPlanet {
  const decanIndex = signIndex * 3 + Math.floor(degIn / 10);
  const marsOffset = 2; // Chaldean order begins at Saturn; faces begin at Mars (index 2).
  return CHALDEAN_ORDER[(marsOffset + decanIndex) % CHALDEAN_ORDER.length] as TraditionalPlanet;
}

function oppositeSign(signIndex: number): number {
  return (signIndex + 6) % 12;
}

export interface Dignities {
  element: Element;
  domicileLord: TraditionalPlanet;
  exaltationLord: TraditionalPlanet | null;
  triplicityLord: TraditionalPlanet;
  boundLord: TraditionalPlanet;
  decanLord: TraditionalPlanet;
  /** The dignities this body holds where it stands: domicile/exaltation/triplicity/bound/decan. */
  held: string[];
  /** What weakens it: detriment, fall. */
  debilities: string[];
  /** Neither dignified nor debilitated — a stranger in the sign. */
  peregrine: boolean;
}

/**
 * The essential dignities of one traditional planet at [longitude], for the
 * chart's [sect]. Null for anything but the seven — nodes, lots, and the modern
 * outers bear no traditional dignity.
 */
export function dignitiesOf(bodyId: string, longitude: number, sect: Sect): Dignities | null {
  const body = asTraditional(bodyId);
  if (body === null) return null;
  const signIndex = signIndexOf(longitude);
  const degIn = degreeInSign(longitude);
  const element = elementOfSignIndex(signIndex);

  const domicileLord = DOMICILE_LORDS[signIndex] as TraditionalPlanet;
  const exaltationLord = EXALTATION_LORDS[signIndex] ?? null;
  const triplicityLord = sect === "diurnal" ? TRIPLICITY[element].day : TRIPLICITY[element].night;
  const boundLord = boundLordOf(signIndex, degIn);
  const decanLord = decanLordOf(signIndex, degIn);

  const inDomicile = domicileLord === body;
  const inExaltation = exaltationLord === body;
  const inDetriment = DOMICILE_LORDS[oppositeSign(signIndex)] === body;
  const inFall = (EXALTATION_LORDS[oppositeSign(signIndex)] ?? null) === body;

  const held: string[] = [];
  if (inDomicile) held.push("domicile");
  if (inExaltation) held.push("exaltation");
  if (triplicityLord === body) held.push("triplicity");
  if (boundLord === body) held.push("bound");
  if (decanLord === body) held.push("decan");

  const debilities: string[] = [];
  if (inDetriment) debilities.push("detriment");
  if (inFall) debilities.push("fall");

  return {
    element,
    domicileLord,
    exaltationLord,
    triplicityLord,
    boundLord,
    decanLord,
    held,
    debilities,
    peregrine: held.length === 0 && !inDetriment && !inFall,
  };
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

// ─── the whole reading ──────────────────────────────────────────────

export interface DoctrinePoint {
  longitude: number;
  sign: string;
  signGlyph: string;
  degIn: string;
  house: number;
}

export interface DoctrineBody extends DoctrinePoint {
  bodyId: string;
  bodyName: string;
  glyph: string;
  retrograde: boolean;
  dignities: Dignities | null;
  antiscion: DoctrinePoint;
  contraAntiscion: DoctrinePoint;
}

export interface DoctrineHouse {
  number: number;
  cusp: number;
  sign: string;
  signGlyph: string;
  degIn: string;
  quarter: HouseQuarter;
}

export interface ChartDoctrine {
  sect: Sect | null;
  sectLight: TraditionalPlanet | null;
  greaterBenefic: TraditionalPlanet | null;
  worseMalefic: TraditionalPlanet | null;
  lots: { fortune: DoctrinePoint; spirit: DoctrinePoint } | null;
  bodies: DoctrineBody[];
  houses: DoctrineHouse[];
}

function pointAt(longitude: number, cusps: number[]): DoctrinePoint {
  return {
    longitude,
    sign: signNameOf(longitude),
    signGlyph: signGlyphOf(longitude),
    degIn: formatDegInSign(longitude),
    house: houseOfLongitude(longitude, cusps),
  };
}

/** The full traditional reading of a chart response — everything the phone shows. */
export function readChart(chart: ChartResponse): ChartDoctrine {
  const sect = sectFromChart(chart);
  const cusps = chart.houses.cusps;

  const bodies: DoctrineBody[] = chart.placements.map((p) => ({
    bodyId: p.body_id,
    bodyName: p.body_name,
    glyph: p.glyph,
    retrograde: p.is_retrograde,
    longitude: p.tropical_longitude,
    sign: signNameOf(p.tropical_longitude),
    signGlyph: signGlyphOf(p.tropical_longitude),
    degIn: formatDegInSign(p.tropical_longitude),
    house: p.house,
    dignities: sect ? dignitiesOf(p.body_id, p.tropical_longitude, sect) : null,
    antiscion: pointAt(antiscion(p.tropical_longitude), cusps),
    contraAntiscion: pointAt(contraAntiscion(p.tropical_longitude), cusps),
  }));

  const houses: DoctrineHouse[] = cusps.slice(0, 12).map((cusp, i) => ({
    number: i + 1,
    cusp,
    sign: signNameOf(cusp),
    signGlyph: signGlyphOf(cusp),
    degIn: formatDegInSign(cusp),
    quarter: houseQuarter(i + 1),
  }));

  let lots: ChartDoctrine["lots"] = null;
  if (sect) {
    const sun = chart.placements.find((p) => p.body_id === "sun");
    const moon = chart.placements.find((p) => p.body_id === "moon");
    if (sun && moon) {
      const asc = chart.houses.ascendant;
      lots = {
        fortune: pointAt(
          lotOfFortune(asc, sun.tropical_longitude, moon.tropical_longitude, sect),
          cusps,
        ),
        spirit: pointAt(
          lotOfSpirit(asc, sun.tropical_longitude, moon.tropical_longitude, sect),
          cusps,
        ),
      };
    }
  }

  return {
    sect,
    sectLight: sect ? sectLight(sect) : null,
    greaterBenefic: sect ? greaterBenefic(sect) : null,
    worseMalefic: sect ? worseMalefic(sect) : null,
    lots,
    bodies,
    houses,
  };
}
