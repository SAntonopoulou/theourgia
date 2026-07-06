/**
 * Editorial constants for the I Ching surface — verbatim from
 * `Theourgia I Ching.dc.html`. Citation copy follows the H04 §S3.3
 * scholarly-honesty rule (the ‡ primary badge).
 */

/** Subtitle below the surface title (line 79). */
export const ICHING_SUBTITLE =
  "易經 · the Book of Changes — cast six lines, read what moves";

/** Per-method blurbs (line 324). */
export const METHOD_NOTES = {
  coin: "Quick and even-handed. Three coins, six casts.",
  yarrow:
    "The slower, meditative rite. Take each line in its own time; the odds differ from the coins.",
} as const;

/** Cast-line prompts (line 329). Yarrow's prompt is intentionally
 *  slower ("Breathe, then form the next."). */
export const CAST_INITIAL_PROMPT = "Still the mind. Form the first line.";
export function castProgressPrompt(
  formedCount: number,
  method: "coin" | "yarrow",
): string {
  const continuation =
    method === "yarrow" ? "Breathe, then form the next." : "Form the next.";
  return `Line ${formedCount} of 6 formed. ${continuation}`;
}

/** Empty-state copy when no lines are formed yet (line 197). */
export const ICHING_EMPTY_BODY =
  "Cast the six lines from the bottom up. The hexagram and its reading appear when all six are formed.";

/** No-changing-lines note (line 180). */
export const ICHING_STABLE_NOTE =
  "No changing lines — the situation is stable. Read the hexagram as it stands.";

/** The Wilhelm/Baynes citation (line 185), with Legge fallback. */
export const WILHELM_BAYNES_CITATION =
  "Wilhelm/Baynes, The I Ching, or Book of Changes (public-domain portions); Legge (1899) as fallback";

/** Save caption (line 190). */
export const ICHING_SAVE_CAPTION =
  "The cast, the question, and your reading are kept together.";

/** Empty by default — the practitioner supplies their own question.
 *  Previously seeded with "Should I bring the working forward to the
 *  solstice?" which pre-filled every fresh cast. */
export const ICHING_DEFAULT_QUESTION = "";

/** Line-place names verbatim from `lineName()` (lines 239-243). */
export const LINE_PLACE_NAMES = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
] as const;

/** Construct the changing-line name string ("Nine in the third place"). */
export function lineName(idx: number, value: 6 | 9): string {
  const kind = value === 9 ? "Nine" : "Six";
  return `${kind} in the ${LINE_PLACE_NAMES[idx]} place`;
}

/**
 * Placeholder per-line commentary corpus, verbatim from the mockup's
 * `lineText(idx)` (lines 244-254). The backend supplies real
 * Wilhelm/Baynes text per hexagram; this is the stand-in until that
 * lands. Six entries indexed by line position (0 = bottom line).
 */
export const PLACEHOLDER_LINE_TEXT: readonly string[] = [
  "What moves here asks restraint before action; the ground is not yet firm.",
  "A turning that wants company — do not carry it alone.",
  "The line warns against forcing; let the matter ripen of itself.",
  "A clear opening. Step through it deliberately, not in haste.",
  "Strength at the centre: this is the line that carries the reading.",
  "An ending that completes; let what is finished be finished.",
];
