/**
 * Runes engine — port of the verbatim mockup engine from
 * `Theourgia Runes.dc.html` (H04 handoff, lines 178-237).
 *
 * The load-bearing honesty point (H04 §S3.5): **eight of the 24 Elder
 * Futhark staves are symmetric — they read the same upright or turned
 * and have NO merkstave**. The UI must never show a reversed indicator
 * for these, even when a draw would "reverse" one. This engine encodes
 * `symmetric: true` on those staves and the `drawRunes` function
 * **forces `merkstave: false`** for any symmetric stave drawn — exactly
 * as the mockup engine does (line 236: `const merk = sym ? false : (rnd()<0.3);`).
 */

export type RuneName =
  | "Fehu"
  | "Uruz"
  | "Thurisaz"
  | "Ansuz"
  | "Raidho"
  | "Kenaz"
  | "Gebo"
  | "Wunjo"
  | "Hagalaz"
  | "Nauthiz"
  | "Isa"
  | "Jera"
  | "Eihwaz"
  | "Perthro"
  | "Algiz"
  | "Sowilo"
  | "Tiwaz"
  | "Berkano"
  | "Ehwaz"
  | "Mannaz"
  | "Laguz"
  | "Ingwaz"
  | "Dagaz"
  | "Othala";

export interface Rune {
  name: RuneName;
  /** Elder Futhark Unicode glyph. */
  glyph: string;
  /** Reconstructed Proto-Germanic name (e.g. "*fehu"). */
  protoGermanic: string;
  /** One-word keyword (e.g. "wealth", "the gift"). */
  keyword: string;
  /** Traditional upright meaning (verbatim from the .dc.html dataset). */
  upright: string;
  /** Traditional merkstave (reversed) meaning. NULL when the stave is
   *  symmetric — these have no merkstave by tradition. */
  merkstave: string | null;
  /** True for symmetric staves — those that read the same upright or
   *  turned. Forces `merkstave: false` on any draw. Per the verbatim
   *  mockup dataset there are **9**: Gebo, Hagalaz, Isa, Jera, Eihwaz,
   *  Mannaz, Sowilo, Ingwaz, Dagaz. (The H04 supplement §S3.5
   *  enumerates 8 — Mannaz is omitted from that prose list, but its
   *  glyph ᛗ is rotationally symmetric and the mockup data correctly
   *  marks it; we trust the data.) */
  symmetric: boolean;
}

/**
 * The 24 Elder Futhark, verbatim from `Theourgia Runes.dc.html`
 * lines 182-205. Order matches the canonical Elder Futhark sequence
 * (Fehu → Othala).
 */
export const ELDER_FUTHARK: readonly Rune[] = [
  {
    name: "Fehu",
    glyph: "ᚠ",
    protoGermanic: "*fehu",
    keyword: "wealth",
    upright:
      "Earned wealth, abundance, and what must circulate to stay alive.",
    merkstave: "Loss, greed, wealth hoarded or slipping away.",
    symmetric: false,
  },
  {
    name: "Uruz",
    glyph: "ᚢ",
    protoGermanic: "*ūruz",
    keyword: "strength",
    upright: "Raw vital force, health, the will to shape circumstance.",
    merkstave: "Strength misused, weakness, a force without direction.",
    symmetric: false,
  },
  {
    name: "Thurisaz",
    glyph: "ᚦ",
    protoGermanic: "*þurisaz",
    keyword: "thorn",
    upright:
      "A reactive force, a defended threshold; act with caution.",
    merkstave:
      "Defencelessness, harmful compulsion, a thorn turned inward.",
    symmetric: false,
  },
  {
    name: "Ansuz",
    glyph: "ᚨ",
    protoGermanic: "*ansuz",
    keyword: "the god",
    upright: "Insight, the word, counsel; a message worth heeding.",
    merkstave:
      "Misheard counsel, vanity, communication gone astray.",
    symmetric: false,
  },
  {
    name: "Raidho",
    glyph: "ᚱ",
    protoGermanic: "*raidō",
    keyword: "the ride",
    upright:
      "A journey with purpose; right action, rhythm, the road taken.",
    merkstave:
      "Disruption, a journey ill-timed, things out of order.",
    symmetric: false,
  },
  {
    name: "Kenaz",
    glyph: "ᚲ",
    protoGermanic: "*kenaz",
    keyword: "the torch",
    upright:
      "Illumination, craft, knowledge that warms and reveals.",
    merkstave:
      "The light withdrawn; confusion, a skill left to gutter out.",
    symmetric: false,
  },
  {
    name: "Gebo",
    glyph: "ᚷ",
    protoGermanic: "*gebō",
    keyword: "the gift",
    upright:
      "Exchange, partnership, a gift that binds giver and receiver.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Wunjo",
    glyph: "ᚹ",
    protoGermanic: "*wunjō",
    keyword: "joy",
    upright: "Harmony, well-earned gladness, belonging.",
    merkstave: "Joy deferred; estrangement, a sweetness soured.",
    symmetric: false,
  },
  {
    name: "Hagalaz",
    glyph: "ᚺ",
    protoGermanic: "*haglaz",
    keyword: "hail",
    upright:
      "Sudden disruption from without; an unbidden testing.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Nauthiz",
    glyph: "ᚾ",
    protoGermanic: "*naudiz",
    keyword: "need",
    upright:
      "Constraint that teaches; necessity, the friction that forges. Difficulty here is instruction, not doom.",
    merkstave: "Need denied, want, a lesson resisted.",
    symmetric: false,
  },
  {
    name: "Isa",
    glyph: "ᛁ",
    protoGermanic: "*īsaz",
    keyword: "ice",
    upright: "Stillness, a freeze, a pause that asks patience.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Jera",
    glyph: "ᛃ",
    protoGermanic: "*jēra",
    keyword: "harvest",
    upright:
      "The turning year, reward in due season; nothing rushed.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Eihwaz",
    glyph: "ᛇ",
    protoGermanic: "*īhwaz",
    keyword: "the yew",
    upright:
      "The axis between worlds; endurance, a reliable defence.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Perthro",
    glyph: "ᛈ",
    protoGermanic: "*perþō",
    keyword: "the lot-cup",
    upright:
      "Mystery, chance, what is hidden in the casting itself.",
    merkstave:
      "Stagnation, secrets kept too long, luck withheld.",
    symmetric: false,
  },
  {
    name: "Algiz",
    glyph: "ᛉ",
    protoGermanic: "*algiz",
    keyword: "protection",
    upright:
      "The warding stave; sanctuary, a hand raised in defence.",
    merkstave: "Exposure, a guard let down, help refused.",
    symmetric: false,
  },
  {
    name: "Sowilo",
    glyph: "ᛊ",
    protoGermanic: "*sōwilō",
    keyword: "the sun",
    upright:
      "Wholeness, vital success, the guiding light that does not fail.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Tiwaz",
    glyph: "ᛏ",
    protoGermanic: "*tīwaz",
    keyword: "Tyr",
    upright:
      "Justice, sacrifice for the right outcome, the just cause.",
    merkstave: "Injustice, zeal spent, a cause that falters.",
    symmetric: false,
  },
  {
    name: "Berkano",
    glyph: "ᛒ",
    protoGermanic: "*berkaną",
    keyword: "the birch",
    upright:
      "Growth, tending, new beginnings nurtured in quiet.",
    merkstave:
      "Stunted growth, neglect, a beginning not yet ready.",
    symmetric: false,
  },
  {
    name: "Ehwaz",
    glyph: "ᛖ",
    protoGermanic: "*ehwaz",
    keyword: "the horse",
    upright:
      "Trusted partnership, steady movement, two in accord.",
    merkstave: "Discord between partners, a journey stalled.",
    symmetric: false,
  },
  {
    name: "Mannaz",
    glyph: "ᛗ",
    protoGermanic: "*mannaz",
    keyword: "humankind",
    upright:
      "The self in community; wit, the shared human craft.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Laguz",
    glyph: "ᛚ",
    protoGermanic: "*laguz",
    keyword: "water",
    upright:
      "The deep, intuition, what flows and what is felt beneath.",
    merkstave:
      "Confused feeling, a current resisted, overwhelm.",
    symmetric: false,
  },
  {
    name: "Ingwaz",
    glyph: "ᛜ",
    protoGermanic: "*ingwaz",
    keyword: "Ing",
    upright:
      "Gestation, stored potential, a seed about to be released.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Dagaz",
    glyph: "ᛞ",
    protoGermanic: "*dagaz",
    keyword: "day",
    upright: "Breakthrough, the turn from dark to light, awakening.",
    merkstave: null,
    symmetric: true,
  },
  {
    name: "Othala",
    glyph: "ᛟ",
    protoGermanic: "*ōþalą",
    keyword: "inheritance",
    upright:
      "Ancestral ground, what is rightfully yours to keep and tend.",
    merkstave:
      "Inheritance disputed, a rootlessness, what cannot be held.",
    symmetric: false,
  },
];

/** Build a fresh copy of the 24 staves. Caller-facing alias of
 *  `ELDER_FUTHARK` for engines that may shuffle in place. */
export function buildFuthark(): Rune[] {
  return [...ELDER_FUTHARK];
}

/** Lookup a stave by canonical name. */
export function findRune(name: RuneName): Rune {
  const r = ELDER_FUTHARK.find((rune) => rune.name === name);
  if (!r) {
    throw new Error(`Unknown rune: ${name}`);
  }
  return r;
}

// ─── Layouts ─────────────────────────────────────────────────────

export type RuneDrawSize = 1 | 3 | 5;

export interface RunePosition {
  /** Centre-x as a percentage of the board. */
  x: number;
  /** Centre-y as a percentage of the board. */
  y: number;
  label: string;
}

export interface RuneLayout {
  /** Spread name shown above the board. */
  name: string;
  positions: readonly RunePosition[];
}

/**
 * Spread layouts — single stave, three Norns, five-stave cross.
 * Verbatim from `Theourgia Runes.dc.html` line 208-212.
 */
export function layoutForSize(size: RuneDrawSize): RuneLayout {
  if (size === 1) {
    return {
      name: "Single stave",
      positions: [{ x: 50, y: 50, label: "The stave" }],
    };
  }
  if (size === 3) {
    return {
      name: "The Norns · what was · what is · what shall be",
      positions: [
        { x: 22, y: 50, label: "Urðr — what was" },
        { x: 50, y: 50, label: "Verðandi — what is" },
        { x: 78, y: 50, label: "Skuld — what shall be" },
      ],
    };
  }
  return {
    name: "The five-stave cross",
    positions: [
      { x: 50, y: 50, label: "The matter" },
      { x: 50, y: 12, label: "What crowns it" },
      { x: 84, y: 50, label: "Where it tends" },
      { x: 50, y: 88, label: "What underlies it" },
      { x: 16, y: 50, label: "What has passed" },
    ],
  };
}

// ─── Draw ────────────────────────────────────────────────────────

export interface RuneDrawn {
  /** 0-based index into the layout's positions array. */
  position: number;
  /** Position label, copied from the layout for convenience. */
  positionLabel: string;
  rune: Rune;
  /** True when the stave is drawn merkstave (reversed). ALWAYS false
   *  for symmetric staves — that's the H04 §S3.5 honesty rule. */
  merkstave: boolean;
}

/** Seeded XOR-shift RNG. Verbatim from `Theourgia Runes.dc.html`
 *  line 233. Used so tests + visual fixtures are deterministic. */
function seededRandom(seed: number): () => number {
  let x = (seed * 2654435761) >>> 0;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

/**
 * Draw N staves from the bag — no repeats. The 30% merkstave
 * threshold matches the mockup (line 236). Symmetric staves are
 * forced upright regardless of the roll — the H04 honesty rule.
 *
 * Accepts either a seed (number) for deterministic draws, or a
 * `random` function (`() => number` in [0,1)) for custom sources.
 */
export function drawRunes(
  size: RuneDrawSize,
  source: number | (() => number) = Math.random,
): RuneDrawn[] {
  const random =
    typeof source === "number" ? seededRandom(source) : source;
  const layout = layoutForSize(size);
  const futhark = buildFuthark();
  const used = new Set<number>();
  const result: RuneDrawn[] = [];

  for (let i = 0; i < layout.positions.length; i++) {
    let idx: number;
    do {
      idx = Math.floor(random() * futhark.length);
    } while (used.has(idx));
    used.add(idx);
    const rune = futhark[idx]!;
    const merkstave = rune.symmetric ? false : random() < 0.3;
    result.push({
      position: i,
      positionLabel: layout.positions[i]!.label,
      rune,
      merkstave,
    });
  }

  return result;
}

/** The 9 staves that have no merkstave (sourced from the mockup
 *  dataset, listed in canonical Futhark order). Useful for callers
 *  that need to filter or audit. */
export const SYMMETRIC_RUNES: readonly RuneName[] = [
  "Gebo",
  "Hagalaz",
  "Isa",
  "Jera",
  "Eihwaz",
  "Sowilo",
  "Mannaz",
  "Ingwaz",
  "Dagaz",
];
