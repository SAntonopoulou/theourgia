/**
 * I Ching engine — port of the verbatim mockup engine from
 * `Theourgia I Ching.dc.html` (H04 handoff, lines 213-292).
 *
 * Two casting methods with deliberately different odds (H04 §S3.2):
 *   - Coin (3 coins): each coin heads/tails → sum + 6 ∈ {6,7,8,9},
 *     binomial distribution giving 6=1/8, 7=3/8, 8=3/8, 9=1/8.
 *   - Yarrow stalk: 6=1/16, 7=5/16, 8=7/16, 9=3/16. The yarrow rite
 *     is slower AND has different odds — the UI must respect both.
 *
 * Line values:
 *   6 = old yin   (changing, becomes yang)
 *   7 = young yang (stable)
 *   8 = young yin  (stable)
 *   9 = old yang  (changing, becomes yin)
 *
 * Hexagram resolution is purely derived from the six lines — never
 * stored. (See the H04 supplement §E worked example for the same
 * discipline applied to Geomancy.)
 */

// ─── Line values & predicates ─────────────────────────────────────

/** The four possible line values per the traditional rite. */
export type LineValue = 6 | 7 | 8 | 9;

/** True for the yang lines (7 = young yang, 9 = old yang). */
export function isYang(value: LineValue): boolean {
  return value === 7 || value === 9;
}

/** True for the changing lines (6 = old yin, 9 = old yang). */
export function isChanging(value: LineValue): boolean {
  return value === 6 || value === 9;
}

// ─── Trigrams ────────────────────────────────────────────────────

export interface Trigram {
  /** Pinyin name (Qian, Kun, …). */
  name: string;
  /** English image (Heaven, Earth, Thunder, …). */
  image: string;
  /** Unicode glyph (☰ ☷ ☳ ☵ ☱ ☶ ☲ ☴). */
  glyph: string;
}

/**
 * Trigrams indexed by their binary value:
 *   tv(line0, line1, line2) = yang(line0) + 2·yang(line1) + 4·yang(line2)
 *
 * Verbatim from `Theourgia I Ching.dc.html` lines 258 + 267. The
 * Pinyin name array (`trigName`) and the comp() array share this
 * index space.
 */
export const TRIGRAMS: readonly Trigram[] = [
  { name: "Kun", image: "Earth", glyph: "☷" }, // 0 = 000
  { name: "Zhen", image: "Thunder", glyph: "☳" }, // 1 = 100
  { name: "Kan", image: "Water", glyph: "☵" }, // 2 = 010
  { name: "Dui", image: "Lake", glyph: "☱" }, // 3 = 110
  { name: "Gen", image: "Mountain", glyph: "☶" }, // 4 = 001
  { name: "Li", image: "Fire", glyph: "☲" }, // 5 = 101
  { name: "Xun", image: "Wind", glyph: "☴" }, // 6 = 011
  { name: "Qian", image: "Heaven", glyph: "☰" }, // 7 = 111
];

/** Trigram look-up order used by the King-Wen table. Verbatim from
 *  `Theourgia I Ching.dc.html` line 259. */
const TRIGRAM_LOOKUP_ORDER: readonly string[] = [
  "Qian",
  "Zhen",
  "Kan",
  "Gen",
  "Kun",
  "Xun",
  "Li",
  "Dui",
];

/** The full 8×8 King-Wen lookup grid. Verbatim from line 260.
 *
 *   KING_WEN[lowerTrigramName][TRIGRAM_LOOKUP_ORDER.indexOf(upperTrigramName)]
 *
 * gives the King-Wen number ∈ 1..64. */
export const KING_WEN: Record<string, readonly number[]> = {
  Qian: [1, 34, 5, 26, 11, 9, 14, 43],
  Zhen: [25, 51, 3, 27, 24, 42, 21, 17],
  Kan: [6, 40, 29, 4, 7, 59, 64, 47],
  Gen: [33, 62, 39, 52, 15, 53, 56, 31],
  Kun: [12, 16, 8, 23, 2, 20, 35, 45],
  Xun: [44, 32, 48, 18, 46, 57, 50, 28],
  Li: [13, 55, 63, 22, 36, 37, 30, 49],
  Dui: [10, 54, 60, 41, 19, 61, 38, 58],
};

function trigramBinary(a: LineValue, b: LineValue, c: LineValue): number {
  return (isYang(a) ? 1 : 0) + (isYang(b) ? 2 : 0) + (isYang(c) ? 4 : 0);
}

/** The lower trigram (lines 1-3, indexes 0-2 in our bottom-up array). */
export function lowerTrigram(lines: readonly LineValue[]): Trigram {
  const v = trigramBinary(lines[0]!, lines[1]!, lines[2]!);
  return TRIGRAMS[v]!;
}

/** The upper trigram (lines 4-6, indexes 3-5). */
export function upperTrigram(lines: readonly LineValue[]): Trigram {
  const v = trigramBinary(lines[3]!, lines[4]!, lines[5]!);
  return TRIGRAMS[v]!;
}

/** Composition string in the mockup format:
 *  `"☰ Heaven over ☷ Earth"`. Verbatim from `comp()` line 271. */
export function trigramComposition(lines: readonly LineValue[]): string {
  const up = upperTrigram(lines);
  const lo = lowerTrigram(lines);
  return `${up.glyph} ${up.image} over ${lo.glyph} ${lo.image}`;
}

// ─── Hexagram resolution ─────────────────────────────────────────

/**
 * King-Wen number (1..64) for the six-line cast. Lines are bottom-up
 * (index 0 = bottom, index 5 = top), per the traditional rite.
 * Verbatim from `hexNum()` lines 257-265.
 */
export function hexagramNumber(lines: readonly LineValue[]): number {
  if (lines.length !== 6) {
    throw new Error(
      `hexagramNumber requires exactly 6 lines, got ${lines.length}`,
    );
  }
  const lo = lowerTrigram(lines).name;
  const up = upperTrigram(lines).name;
  const row = KING_WEN[lo];
  if (!row) {
    throw new Error(`No KING_WEN row for trigram ${lo}`);
  }
  const col = TRIGRAM_LOOKUP_ORDER.indexOf(up);
  if (col < 0) {
    throw new Error(`No KING_WEN column for trigram ${up}`);
  }
  return row[col]!;
}

export interface Transformation {
  /** 0-based indexes of the changing lines (6 or 9). Empty when the
   *  hexagram is stable. */
  changingLines: number[];
  /** King-Wen of the relating hexagram (after changing lines flip).
   *  Equal to the primary hexagram when no lines change. */
  relating: number;
}

/**
 * Compute the changing-line transformation. Verbatim from lines
 * 298-302: any 6 becomes 8 (yin→yang then becomes young yin?), no —
 * the mockup flips each changing line to its *opposite* fresh young
 * value: 9 → 8, 6 → 7. The relating hexagram is computed from the
 * post-flip lines.
 */
export function transformation(
  lines: readonly LineValue[],
): Transformation {
  const changingLines: number[] = [];
  const relLines: LineValue[] = lines.map((v, i) => {
    if (isChanging(v)) {
      changingLines.push(i);
      return v === 9 ? 8 : 7;
    }
    return v;
  });
  return {
    changingLines,
    relating: hexagramNumber(relLines),
  };
}

// ─── Hexagram names (CN + Pinyin + English) ──────────────────────

/**
 * Hexagram names indexed 1..64 (index 0 is the empty/unused slot from
 * the mockup arrays). Verbatim from `data()` lines 222-224. The full
 * Judgment + Image texts come from the backend; only the names ship
 * client-side.
 */
export const HEX_NAMES_CN: readonly string[] = [
  "",
  "乾",
  "坤",
  "屯",
  "蒙",
  "需",
  "訟",
  "師",
  "比",
  "小畜",
  "履",
  "泰",
  "否",
  "同人",
  "大有",
  "謙",
  "豫",
  "隨",
  "蠱",
  "臨",
  "觀",
  "噬嗑",
  "賁",
  "剝",
  "復",
  "無妄",
  "大畜",
  "頤",
  "大過",
  "坎",
  "離",
  "咸",
  "恆",
  "遯",
  "大壯",
  "晉",
  "明夷",
  "家人",
  "睽",
  "蹇",
  "解",
  "損",
  "益",
  "夬",
  "姤",
  "萃",
  "升",
  "困",
  "井",
  "革",
  "鼎",
  "震",
  "艮",
  "漸",
  "歸妹",
  "豐",
  "旅",
  "巽",
  "兌",
  "渙",
  "節",
  "中孚",
  "小過",
  "既濟",
  "未濟",
];

export const HEX_NAMES_PINYIN: readonly string[] = [
  "",
  "Qián",
  "Kūn",
  "Zhūn",
  "Méng",
  "Xū",
  "Sòng",
  "Shī",
  "Bǐ",
  "Xiǎo Chù",
  "Lǚ",
  "Tài",
  "Pǐ",
  "Tóng Rén",
  "Dà Yǒu",
  "Qiān",
  "Yù",
  "Suí",
  "Gǔ",
  "Lín",
  "Guān",
  "Shì Kè",
  "Bì",
  "Bō",
  "Fù",
  "Wú Wàng",
  "Dà Chù",
  "Yí",
  "Dà Guò",
  "Kǎn",
  "Lí",
  "Xián",
  "Héng",
  "Dùn",
  "Dà Zhuàng",
  "Jìn",
  "Míng Yí",
  "Jiā Rén",
  "Kuí",
  "Jiǎn",
  "Xiè",
  "Sǔn",
  "Yì",
  "Guài",
  "Gòu",
  "Cuì",
  "Shēng",
  "Kùn",
  "Jǐng",
  "Gé",
  "Dǐng",
  "Zhèn",
  "Gèn",
  "Jiàn",
  "Guī Mèi",
  "Fēng",
  "Lǚ",
  "Xùn",
  "Duì",
  "Huàn",
  "Jié",
  "Zhōng Fú",
  "Xiǎo Guò",
  "Jì Jì",
  "Wèi Jì",
];

export const HEX_NAMES_EN: readonly string[] = [
  "",
  "The Creative",
  "The Receptive",
  "Difficulty at the Beginning",
  "Youthful Folly",
  "Waiting",
  "Conflict",
  "The Army",
  "Holding Together",
  "Taming Power of the Small",
  "Treading",
  "Peace",
  "Standstill",
  "Fellowship with Men",
  "Great Possession",
  "Modesty",
  "Enthusiasm",
  "Following",
  "Work on the Decayed",
  "Approach",
  "Contemplation",
  "Biting Through",
  "Grace",
  "Splitting Apart",
  "Return",
  "Innocence",
  "Taming Power of the Great",
  "The Corners of the Mouth",
  "Great Preponderance",
  "The Abysmal Water",
  "The Clinging Fire",
  "Influence",
  "Duration",
  "Retreat",
  "Power of the Great",
  "Progress",
  "Darkening of the Light",
  "The Family",
  "Opposition",
  "Obstruction",
  "Deliverance",
  "Decrease",
  "Increase",
  "Breakthrough",
  "Coming to Meet",
  "Gathering Together",
  "Pushing Upward",
  "Oppression",
  "The Well",
  "Revolution",
  "The Cauldron",
  "The Arousing",
  "Keeping Still",
  "Development",
  "The Marrying Maiden",
  "Abundance",
  "The Wanderer",
  "The Gentle",
  "The Joyous",
  "Dispersion",
  "Limitation",
  "Inner Truth",
  "Small Preponderance",
  "After Completion",
  "Before Completion",
];

export interface HexagramName {
  number: number;
  chinese: string;
  pinyin: string;
  english: string;
}

export function hexagramName(num: number): HexagramName {
  if (num < 1 || num > 64) {
    throw new Error(`Invalid King-Wen number: ${num}`);
  }
  return {
    number: num,
    chinese: HEX_NAMES_CN[num]!,
    pinyin: HEX_NAMES_PINYIN[num]!,
    english: HEX_NAMES_EN[num]!,
  };
}

// ─── Cast ────────────────────────────────────────────────────────

export type IchingMethod = "coin" | "yarrow";

/**
 * Cast one line. Coin and yarrow give intentionally distinct odds.
 * Verbatim from `castOne()` lines 288-292.
 *
 *   Coin (3 coins flipped, sum + 6):
 *     6 = 1/8   (three tails)
 *     7 = 3/8   (one head)
 *     8 = 3/8   (two heads)
 *     9 = 1/8   (three heads)
 *
 *   Yarrow (the slower rite, distinct probabilities):
 *     6 = 1/16
 *     7 = 5/16
 *     8 = 7/16
 *     9 = 3/16
 */
export function castLine(
  method: IchingMethod,
  random: () => number = Math.random,
): LineValue {
  if (method === "coin") {
    let heads = 0;
    for (let k = 0; k < 3; k++) heads += random() < 0.5 ? 1 : 0;
    return (6 + heads) as LineValue;
  }
  // Yarrow odds — strictly different from coins.
  const r = random();
  if (r < 1 / 16) return 6;
  if (r < 6 / 16) return 7;
  if (r < 13 / 16) return 8;
  return 9;
}

/** Cast all six lines in one go (bottom-up order). The surface uses
 *  this for the coin-only "Cast all six" shortcut; the yarrow rite
 *  remains line-by-line to respect the meditative pacing. */
export function castSixLines(
  method: IchingMethod,
  random: () => number = Math.random,
): [LineValue, LineValue, LineValue, LineValue, LineValue, LineValue] {
  return [
    castLine(method, random),
    castLine(method, random),
    castLine(method, random),
    castLine(method, random),
    castLine(method, random),
    castLine(method, random),
  ];
}
