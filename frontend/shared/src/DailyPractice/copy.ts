/**
 * Editorial constants for Daily Practice Tracker — verbatim from the
 * designer's `Theourgia Daily Practice Tracker.dc.html`.
 *
 * Wellbeing copy is non-negotiable; never improvise. The supplement
 * §S3.4 calls this surface out by name: "a skipped day is its own
 * neutral state … 'A skip is information, not a failure.'" The strings
 * here are the single source of truth for any composition.
 */

import type { TodayStatus } from "../practice/index.js";

/**
 * Practice status headlines — single-line summary the capture row
 * shows next to the status icon. Verbatim from the mockup (line 340).
 */
export const PRACTICE_STATUS_HEADLINE: Record<TodayStatus, string> = {
  done: "Kept today",
  skipped: "Skipped today",
  pending: "Not yet today",
};

/**
 * Practice status sub-copy — second line beneath the headline.
 * Verbatim from the mockup (line 341). The skipped variant is the
 * load-bearing wellbeing string ("A skip is information, not a
 * failure.").
 */
export const PRACTICE_STATUS_SUB: Record<TodayStatus, string> = {
  done: "Recorded just now. Nothing more is needed.",
  skipped:
    "A skip is information, not a failure. The record holds it plainly.",
  pending: "Mark it when the practice is done, or note a skip.",
};

/** Cadence chips offered in the Define-a-Practice drawer.
 *  Verbatim from the mockup (line 360). */
export type CadenceOption =
  | "daily"
  | "weekly"
  | "morning"
  | "before-sleep"
  | "dark-moon"
  | "custom";

export const CADENCE_OPTIONS: ReadonlyArray<{
  key: CadenceOption;
  label: string;
}> = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "morning", label: "Each morning" },
  { key: "before-sleep", label: "Before sleep" },
  { key: "dark-moon", label: "Every dark moon" },
  { key: "custom", label: "Custom…" },
];

/** Status chip labels on the Today band. Verbatim from line 356. */
export const TODAY_CHIP_LABEL: Record<TodayStatus, string> = {
  done: "Kept",
  skipped: "Skipped",
  pending: "Pending",
};

/** Empty-state copy — title + paragraph + CTA. Verbatim from
 *  the mockup (lines 201-203). */
export const EMPTY_STATE_TITLE = "No practice set yet";
export const EMPTY_STATE_BODY =
  "A daily practice is whatever you decide to return to — a morning grounding, a devotion, a banishing before sleep. Name it, set how often, and it joins your Today rail. There is nothing to win here; the record simply remembers.";
export const EMPTY_STATE_CTA = "Define your first practice";

/** Cell tooltips on the 5-week streak grid. Verbatim from line 293. */
export const STREAK_CELL_TITLE = {
  done: "Kept",
  skip: "Skipped",
  miss: "Not kept",
} as const;
