/**
 * Editorial constants for the Runes surface — verbatim from
 * `Theourgia Runes.dc.html` (H04 handoff). The symmetric-stave
 * callout is load-bearing for §S3.5: never imply a merkstave for
 * the symmetric staves.
 */

export const RUNES_SUBTITLE =
  "Elder Futhark · draw from the bag and read the staves";

/** Empty by default — the practitioner supplies their own question.
 *  Previously seeded with "What stands before me, and what walks
 *  beside it?" which pre-filled every fresh draw. */
export const RUNES_DEFAULT_QUESTION = "";

export const RUNES_DRAW_LABEL = "Draw the runes";

export const RUNES_TRADITIONAL_EYEBROW = "Traditional reading";

export const RUNES_YOUR_READING_EYEBROW = "Your reading";

export const RUNES_READING_PLACEHOLDER =
  "What this stave says to you, here, now…";

/** Verbatim merkstave pill from line 130. Used when a non-symmetric
 *  stave is drawn reversed. */
export const RUNES_MERKSTAVE_PILL = "Merkstave (reversed)";

/**
 * Symmetric-stave callout — the load-bearing §S3.5 honesty rule
 * (line 141). Tells the practitioner why no merkstave is shown for
 * the symmetric eight (or nine, per the dataset).
 */
export const RUNES_SYMMETRIC_NOTE =
  "A symmetric stave — it reads the same upright or turned. It has no merkstave; none is shown.";

/** Source citation for the rune poems (line 147). */
export const RUNES_CITATION =
  "After the Old English & Norwegian rune poems (public domain)";

export const RUNES_SAVE_LABEL = "Save draw to journal";

export const RUNES_SAVE_CAPTION =
  "The runes, their positions, and your reading are kept together.";

/** Verbatim draw-size labels (mockup uses just the number). */
export const RUNES_SIZE_OPTIONS: ReadonlyArray<{
  key: 1 | 3 | 5;
  label: string;
}> = [
  { key: 1, label: "Single stave" },
  { key: 3, label: "Three Norns" },
  { key: 5, label: "Five-stave cross" },
];
