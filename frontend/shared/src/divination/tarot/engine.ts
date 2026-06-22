/**
 * Tarot engine — port of the verbatim mockup engine from
 * `Theourgia Tarot.dc.html` (H04 handoff, lines 226-303).
 *
 * The PD Rider-Waite-Smith deck (78 cards) is the default shipped
 * in-app. Card meaning text + the high-fidelity card images come from
 * the backend (per A.2 in `agent_data_and_components_H04.md`); this
 * engine ships the *structure* — names, suits, numerals, spread
 * layouts — and the pure draw function.
 *
 * Reversed cards are a gentle rotation indicator (⟲ in the surface),
 * NEVER red — per the H04 §S3.1 tone rule.
 */

// ─── Card model ──────────────────────────────────────────────────

export type Arcana = "Major Arcana" | "Minor Arcana";

export type TarotSuit = "Wands" | "Cups" | "Swords" | "Pentacles";

export type MinorRank =
  | "Ace"
  | "Two"
  | "Three"
  | "Four"
  | "Five"
  | "Six"
  | "Seven"
  | "Eight"
  | "Nine"
  | "Ten"
  | "Page"
  | "Knight"
  | "Queen"
  | "King";

export interface TarotCard {
  name: string;
  kind: Arcana;
  /** Roman numeral on Major Arcana cards ("0" through "XXI"); null for Minors. */
  numeral: string | null;
  /** Suit name on Minor Arcana cards; null for Majors. */
  suit: TarotSuit | null;
  /** Alchemical glyph on Minors — 🜂 🜄 🜁 🜃. Null for Majors. */
  suitGlyph: string | null;
  /** Rank on Minors (Ace..King); null for Majors. */
  rank: MinorRank | null;
}

// Verbatim from `Theourgia Tarot.dc.html` line 228.
const MAJOR_ARCANA: ReadonlyArray<readonly [string, string]> = [
  ["0", "The Fool"],
  ["I", "The Magician"],
  ["II", "The High Priestess"],
  ["III", "The Empress"],
  ["IV", "The Emperor"],
  ["V", "The Hierophant"],
  ["VI", "The Lovers"],
  ["VII", "The Chariot"],
  ["VIII", "Strength"],
  ["IX", "The Hermit"],
  ["X", "Wheel of Fortune"],
  ["XI", "Justice"],
  ["XII", "The Hanged Man"],
  ["XIII", "Death"],
  ["XIV", "Temperance"],
  ["XV", "The Devil"],
  ["XVI", "The Tower"],
  ["XVII", "The Star"],
  ["XVIII", "The Moon"],
  ["XIX", "The Sun"],
  ["XX", "Judgement"],
  ["XXI", "The World"],
];

// Verbatim from line 230.
const SUITS: ReadonlyArray<readonly [TarotSuit, string]> = [
  ["Wands", "🜂"],
  ["Cups", "🜄"],
  ["Swords", "🜁"],
  ["Pentacles", "🜃"],
];

// Verbatim from line 231.
const RANKS: readonly MinorRank[] = [
  "Ace",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Page",
  "Knight",
  "Queen",
  "King",
];

/**
 * Build a fresh copy of the 78-card RWS deck. Verbatim from `deck()`
 * lines 226-234: 22 Majors then 56 Minors in suit-then-rank order
 * (Wands Ace..King, Cups Ace..King, Swords Ace..King, Pentacles
 * Ace..King).
 */
export function buildDeck(): TarotCard[] {
  const cards: TarotCard[] = [];
  for (const [numeral, name] of MAJOR_ARCANA) {
    cards.push({
      name,
      kind: "Major Arcana",
      numeral,
      suit: null,
      suitGlyph: null,
      rank: null,
    });
  }
  for (const [suit, glyph] of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        name: `${rank} of ${suit}`,
        kind: "Minor Arcana",
        numeral: null,
        suit,
        suitGlyph: glyph,
        rank,
      });
    }
  }
  return cards;
}

// ─── Spread layouts ──────────────────────────────────────────────

export type SpreadKind =
  | "single"
  | "three"
  | "celtic"
  | "relationship"
  | "year";

export interface SpreadPosition {
  /** Centre-x as a percentage of the board. */
  x: number;
  /** Centre-y as a percentage of the board. */
  y: number;
  label: string;
  /** Rotation in degrees (used in Celtic Cross for the Crossing
   *  card). Defaults to 0 / undefined. */
  rot?: number;
}

export interface Spread {
  kind: SpreadKind;
  /** Display name shown above the board. */
  name: string;
  positions: readonly SpreadPosition[];
}

/**
 * Return the layout for a given spread. Verbatim from `layout()`
 * lines 249-262.
 */
export function spreadLayout(kind: SpreadKind): Spread {
  switch (kind) {
    case "single":
      return {
        kind,
        name: "Single card",
        positions: [{ x: 50, y: 50, label: "The card" }],
      };
    case "three":
      return {
        kind,
        name: "Past · Present · Future",
        positions: [
          { x: 22, y: 50, label: "Past" },
          { x: 50, y: 50, label: "Present" },
          { x: 78, y: 50, label: "Future" },
        ],
      };
    case "celtic":
      return {
        kind,
        name: "Celtic Cross",
        positions: [
          { x: 33, y: 50, label: "Present" },
          { x: 33, y: 50, label: "Crossing", rot: 90 },
          { x: 33, y: 84, label: "Foundation" },
          { x: 12, y: 50, label: "Recent past" },
          { x: 33, y: 16, label: "Crown" },
          { x: 54, y: 50, label: "Near future" },
          { x: 82, y: 88, label: "Self" },
          { x: 82, y: 64, label: "Environment" },
          { x: 82, y: 40, label: "Hopes & fears" },
          { x: 82, y: 16, label: "Outcome" },
        ],
      };
    case "relationship":
      return {
        kind,
        name: "Relationship",
        positions: [
          { x: 28, y: 30, label: "You" },
          { x: 72, y: 30, label: "Them" },
          { x: 50, y: 50, label: "The bond" },
          { x: 28, y: 74, label: "Foundation" },
          { x: 72, y: 74, label: "Where it tends" },
        ],
      };
    case "year": {
      const positions: SpreadPosition[] = [];
      // 12 months on a clock-face, then the centre = "The year".
      for (let i = 0; i < 12; i++) {
        const angle = ((-90 + i * 30) * Math.PI) / 180;
        positions.push({
          x: 50 + 38 * Math.cos(angle),
          y: 50 + 40 * Math.sin(angle),
          label: `Month ${i + 1}`,
        });
      }
      positions.push({ x: 50, y: 50, label: "The year" });
      return { kind, name: "Year ahead", positions };
    }
    default: {
      // Unreachable when callers respect SpreadKind, but defend.
      return {
        kind: "single",
        name: "Single card",
        positions: [{ x: 50, y: 50, label: "The card" }],
      };
    }
  }
}

// ─── Draw ────────────────────────────────────────────────────────

export interface DrawnCard {
  /** 0-based index into the spread's positions array. */
  position: number;
  /** Position label, copied from the spread for convenience. */
  positionLabel: string;
  card: TarotCard;
  /** True when the card is drawn reversed. The surface renders this
   *  as a gentle rotation indicator (⟲), NEVER red. */
  reversed: boolean;
}

/** Seeded XOR-shift RNG. Verbatim from `Theourgia Tarot.dc.html` line
 *  300. Same construction as the runes engine. */
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
 * Draw cards for a spread. No repeats. The reversal probability is
 * 28%, verbatim from the mockup (line 303: `reversed: rnd()<0.28`).
 *
 * Accepts either a seed number for deterministic draws or a custom
 * `random` source (`() => number` in [0,1)).
 */
export function drawSpread(
  kind: SpreadKind,
  source: number | (() => number) = Math.random,
): DrawnCard[] {
  const random =
    typeof source === "number" ? seededRandom(source) : source;
  const spread = spreadLayout(kind);
  const deck = buildDeck();
  const used = new Set<number>();
  const result: DrawnCard[] = [];

  for (let i = 0; i < spread.positions.length; i++) {
    let idx: number;
    do {
      idx = Math.floor(random() * deck.length);
    } while (used.has(idx));
    used.add(idx);
    result.push({
      position: i,
      positionLabel: spread.positions[i]!.label,
      card: deck[idx]!,
      reversed: random() < 0.28,
    });
  }

  return result;
}

/** All 5 spread kinds in the order the mockup presents them. */
export const SPREAD_ORDER: readonly SpreadKind[] = [
  "single",
  "three",
  "celtic",
  "relationship",
  "year",
];
