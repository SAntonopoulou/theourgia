/**
 * Editorial constants for the Tarot surface — verbatim from
 * `Theourgia Tarot.dc.html` (H04 handoff). Citation copy is
 * **load-bearing for scholarly honesty** (§S3.3): never present
 * traditional text as the app's own claim.
 */

import type { SpreadKind } from "../divination/index.js";

/** The ritual prompt above the Draw button before the spread is
 *  cast. Verbatim from line 134. */
export const TAROT_RITUAL_PROMPT = "Breathe. Hold the question, then draw.";

/** Mockup question default (line 353). Surface lets the practitioner
 *  Edit; this is just the initial value. */
export const TAROT_DEFAULT_QUESTION =
  "Should I bring the working forward to the solstice?";

/** Rider–Waite–Smith citation, verbatim from line 161. Used in the
 *  rail's citation chrome (the ‡ primary badge). */
export const TAROT_RWS_CITATION = {
  author: "A. E. Waite",
  title: "The Pictorial Key to the Tarot",
  year: 1911,
} as const;

/** Verbatim spread chip labels (line 323). */
export const TAROT_SPREAD_CHIPS: ReadonlyArray<{
  key: SpreadKind;
  label: string;
}> = [
  { key: "single", label: "Single" },
  { key: "three", label: "Three-card" },
  { key: "celtic", label: "Celtic Cross" },
  { key: "relationship", label: "Relationship" },
  { key: "year", label: "Year ahead" },
];

/** Empty rail prompt when cards are still face-down (line 170). */
export const TAROT_EMPTY_RAIL =
  "When the cards are drawn, select one to read its meaning and write your own.";

/** Textarea placeholder for the practitioner's interpretation
 *  (line 165). */
export const TAROT_READING_PLACEHOLDER =
  "What this card says to you, here, now…";

/** Card-width-per-spread (lines 311-312 of the mockup), in pixels. */
export const TAROT_CARD_WIDTH: Record<SpreadKind, number> = {
  single: 120,
  three: 108,
  celtic: 66,
  relationship: 96,
  year: 66,
};
