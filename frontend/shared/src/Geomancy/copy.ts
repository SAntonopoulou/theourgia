/**
 * Editorial constants for the Geomancy surface — verbatim from
 * `Theourgia Geomancy.dc.html` (H04 handoff).
 *
 * The 12 house topics are the traditional Hellenistic correspondences
 * (1st = the querent / self, 10th = calling / career, etc.). The full
 * geomantic meanings come from the engine's GEO_MEANINGS (B78a).
 */

export const GEOMANCY_SUBTITLE = "Mark the points, raise the shield, read the Judge";

/** Empty by default — the practitioner supplies their own question.
 *  Previously seeded with "Will the lineage petition be granted
 *  before the equinox?" which pre-filled every fresh cast. */
export const GEOMANCY_DEFAULT_QUESTION = "";

/** The two casting methods. Verbatim from lines 105-106. */
export const GEO_METHOD_OPTIONS: ReadonlyArray<{
  key: "gen" | "paper";
  label: string;
  /** One-line hint shown next to the method group. */
  hint: string;
}> = [
  {
    key: "gen",
    label: "Generate the points",
    hint: "Sixteen rows of points are struck and reduced to the four Mothers.",
  },
  {
    key: "paper",
    label: "I cast on paper",
    hint: "Tap a line in each Mother to set it — single point (active) or double (passive).",
  },
];

export const MARK_AGAIN_LABEL = "Mark the points anew";

/** Eyebrow labels. */
export const MOTHERS_EYEBROW = "The four Mothers";
export const SHIELD_EYEBROW =
  "The shield — Mothers & Daughters → Nieces → Witnesses → Judge";
export const HOUSES_EYEBROW = "The twelve houses";

/** 12 house topics in canonical I..XII order, verbatim from line 238. */
export const HOUSE_TOPICS: readonly string[] = [
  "the querent",
  "wealth",
  "kin",
  "home",
  "offspring",
  "work & health",
  "partners",
  "endings",
  "journeys",
  "calling",
  "allies",
  "the hidden",
];

/** Roman numerals for the 12 houses (line 237). */
export const HOUSE_NUMERALS: readonly string[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

/** Verdict aside text labels. */
export const RIGHT_WITNESS_LABEL = "Right witness";
export const LEFT_WITNESS_LABEL = "Left witness";
export const RECONCILER_LABEL = "Reconciler";

export const HOUSES_FOOTNOTE =
  "Houses run I–XII around the frame; the centre holds the witnesses, the Judge, and the Reconciler. Select a house to read the figure that falls in it.";

export const SAVE_CHART_LABEL = "Save chart to journal";

/**
 * Default Mothers — verbatim from the mockup state (line 166).
 * These four figures, when cascaded through the shield, produce the
 * mockup's full demo state.
 */
import type { GeoFigure } from "../divination/index.js";

export const DEFAULT_MOTHERS: readonly [
  GeoFigure,
  GeoFigure,
  GeoFigure,
  GeoFigure,
] = [
  [1, 2, 1, 1],
  [2, 1, 1, 2],
  [1, 1, 2, 2],
  [2, 2, 1, 1],
];
