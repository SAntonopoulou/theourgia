/**
 * Tree of Life path correspondences — port of `Theourgia Practice
 * Logs.dc.html` lines 290-298 (the `paths()` and sephiroth-layout
 * data).
 *
 * Twenty-two paths between the ten sephiroth, each with its Hebrew
 * letter, Latinised name, tarot trump, astrological/elemental
 * attribution, and the route it travels. Path numbering follows the
 * traditional 11..32 scheme (paths 1-10 are the sephiroth themselves).
 *
 * This is verbatim correspondence data; full pathworking content (the
 * practitioner's vision + integration notes) lives in the journal
 * substrate, not here.
 */

export type SephirahName =
  | "Kether"
  | "Chokmah"
  | "Binah"
  | "Chesed"
  | "Geburah"
  | "Tiphareth"
  | "Netzach"
  | "Hod"
  | "Yesod"
  | "Malkuth";

export interface TreeOfLifePath {
  /** Traditional path number 11..32. */
  number: number;
  /** Hebrew letter (א ב ג …). */
  hebrew: string;
  /** Latinised letter name ("Aleph", "Beth", …). */
  letter: string;
  /** Tarot trump (Major Arcana name). */
  trump: string;
  /** Astrological / elemental attribution. */
  attribution: string;
  /** Route ("Kether → Chokmah"). */
  route: string;
  /** Sephirah at the upper end of the path. */
  from: SephirahName;
  /** Sephirah at the lower end. */
  to: SephirahName;
}

/**
 * The 22 paths, verbatim from the mockup. Paths 11..32 in the standard
 * order. Keyed by path number for O(1) lookup.
 */
export const TREE_OF_LIFE_PATHS: Record<number, TreeOfLifePath> = {
  11: {
    number: 11,
    hebrew: "א",
    letter: "Aleph",
    trump: "The Fool",
    attribution: "Air",
    route: "Kether → Chokmah",
    from: "Kether",
    to: "Chokmah",
  },
  12: {
    number: 12,
    hebrew: "ב",
    letter: "Beth",
    trump: "The Magician",
    attribution: "Mercury",
    route: "Kether → Binah",
    from: "Kether",
    to: "Binah",
  },
  13: {
    number: 13,
    hebrew: "ג",
    letter: "Gimel",
    trump: "The High Priestess",
    attribution: "Moon",
    route: "Kether → Tiphareth",
    from: "Kether",
    to: "Tiphareth",
  },
  14: {
    number: 14,
    hebrew: "ד",
    letter: "Daleth",
    trump: "The Empress",
    attribution: "Venus",
    route: "Chokmah → Binah",
    from: "Chokmah",
    to: "Binah",
  },
  15: {
    number: 15,
    hebrew: "ה",
    letter: "Heh",
    trump: "The Star",
    attribution: "Aquarius",
    route: "Chokmah → Tiphareth",
    from: "Chokmah",
    to: "Tiphareth",
  },
  16: {
    number: 16,
    hebrew: "ו",
    letter: "Vau",
    trump: "The Hierophant",
    attribution: "Taurus",
    route: "Chokmah → Chesed",
    from: "Chokmah",
    to: "Chesed",
  },
  17: {
    number: 17,
    hebrew: "ז",
    letter: "Zayin",
    trump: "The Lovers",
    attribution: "Gemini",
    route: "Binah → Tiphareth",
    from: "Binah",
    to: "Tiphareth",
  },
  18: {
    number: 18,
    hebrew: "ח",
    letter: "Cheth",
    trump: "The Chariot",
    attribution: "Cancer",
    route: "Binah → Geburah",
    from: "Binah",
    to: "Geburah",
  },
  19: {
    number: 19,
    hebrew: "ט",
    letter: "Teth",
    trump: "Strength",
    attribution: "Leo",
    route: "Chesed → Geburah",
    from: "Chesed",
    to: "Geburah",
  },
  20: {
    number: 20,
    hebrew: "י",
    letter: "Yod",
    trump: "The Hermit",
    attribution: "Virgo",
    route: "Chesed → Tiphareth",
    from: "Chesed",
    to: "Tiphareth",
  },
  21: {
    number: 21,
    hebrew: "כ",
    letter: "Kaph",
    trump: "Wheel of Fortune",
    attribution: "Jupiter",
    route: "Chesed → Netzach",
    from: "Chesed",
    to: "Netzach",
  },
  22: {
    number: 22,
    hebrew: "ל",
    letter: "Lamed",
    trump: "Justice",
    attribution: "Libra",
    route: "Geburah → Tiphareth",
    from: "Geburah",
    to: "Tiphareth",
  },
  23: {
    number: 23,
    hebrew: "מ",
    letter: "Mem",
    trump: "The Hanged Man",
    attribution: "Water",
    route: "Geburah → Hod",
    from: "Geburah",
    to: "Hod",
  },
  24: {
    number: 24,
    hebrew: "נ",
    letter: "Nun",
    trump: "Death",
    attribution: "Scorpio",
    route: "Tiphareth → Netzach",
    from: "Tiphareth",
    to: "Netzach",
  },
  25: {
    number: 25,
    hebrew: "ס",
    letter: "Samekh",
    trump: "Temperance",
    attribution: "Sagittarius",
    route: "Tiphareth → Yesod",
    from: "Tiphareth",
    to: "Yesod",
  },
  26: {
    number: 26,
    hebrew: "ע",
    letter: "Ayin",
    trump: "The Devil",
    attribution: "Capricorn",
    route: "Tiphareth → Hod",
    from: "Tiphareth",
    to: "Hod",
  },
  27: {
    number: 27,
    hebrew: "פ",
    letter: "Peh",
    trump: "The Tower",
    attribution: "Mars",
    route: "Netzach → Hod",
    from: "Netzach",
    to: "Hod",
  },
  28: {
    number: 28,
    hebrew: "צ",
    letter: "Tzaddi",
    trump: "The Emperor",
    attribution: "Aries",
    route: "Netzach → Yesod",
    from: "Netzach",
    to: "Yesod",
  },
  29: {
    number: 29,
    hebrew: "ק",
    letter: "Qoph",
    trump: "The Moon",
    attribution: "Pisces",
    route: "Netzach → Malkuth",
    from: "Netzach",
    to: "Malkuth",
  },
  30: {
    number: 30,
    hebrew: "ר",
    letter: "Resh",
    trump: "The Sun",
    attribution: "Sun",
    route: "Hod → Yesod",
    from: "Hod",
    to: "Yesod",
  },
  31: {
    number: 31,
    hebrew: "ש",
    letter: "Shin",
    trump: "Judgement",
    attribution: "Fire",
    route: "Hod → Malkuth",
    from: "Hod",
    to: "Malkuth",
  },
  32: {
    number: 32,
    hebrew: "ת",
    letter: "Tau",
    trump: "The World",
    attribution: "Saturn",
    route: "Yesod → Malkuth",
    from: "Yesod",
    to: "Malkuth",
  },
};

/** Iteration order: path 11 → path 32. */
export const TREE_OF_LIFE_PATH_NUMBERS: readonly number[] = Array.from(
  { length: 22 },
  (_, i) => 11 + i,
);

/** Lookup helper that throws when the number isn't a valid path. */
export function pathByNumber(num: number): TreeOfLifePath {
  const p = TREE_OF_LIFE_PATHS[num];
  if (!p) {
    throw new Error(`Invalid Tree of Life path number: ${num}`);
  }
  return p;
}

/**
 * Sephiroth layout — 10 (x,y) coordinates as percentages of the tree
 * board. Verbatim from `Theourgia Practice Logs.dc.html` line 290's
 * companion array (the `S` constant the lines map iterates over). The
 * surface lays the tree in this geometry, then draws lines per the
 * `from`/`to` of each path.
 */
export interface SephirahNode {
  name: SephirahName;
  /** Canonical sephirah number 1..10 (Kether=1 through Malkuth=10). */
  number: number;
  /** Centre-x as a percentage of the board. */
  x: number;
  /** Centre-y as a percentage of the board. */
  y: number;
}

export const SEPHIROTH: readonly SephirahNode[] = [
  { name: "Kether", number: 1, x: 50, y: 8 },
  { name: "Chokmah", number: 2, x: 80, y: 22 },
  { name: "Binah", number: 3, x: 20, y: 22 },
  { name: "Chesed", number: 4, x: 80, y: 42 },
  { name: "Geburah", number: 5, x: 20, y: 42 },
  { name: "Tiphareth", number: 6, x: 50, y: 52 },
  { name: "Netzach", number: 7, x: 80, y: 70 },
  { name: "Hod", number: 8, x: 20, y: 70 },
  { name: "Yesod", number: 9, x: 50, y: 80 },
  { name: "Malkuth", number: 10, x: 50, y: 94 },
];

/** Map from name → SephirahNode for O(1) lookup. */
export const SEPHIROTH_BY_NAME: Record<SephirahName, SephirahNode> =
  Object.fromEntries(SEPHIROTH.map((s) => [s.name, s])) as Record<
    SephirahName,
    SephirahNode
  >;
