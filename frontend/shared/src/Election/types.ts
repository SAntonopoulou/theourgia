/**
 * Election Finder — shared types and editorial copy.
 *
 * Per `Theourgia Election Finder.dc.html`. The product-scoring
 * semantics ("one constraint fails → zero") is the load-bearing
 * invariant of the entire surface; it's named in the explainer copy
 * verbatim because the practitioner needs to know the math.
 */

import type { ReactNode } from "react";

/** A scored election result row as returned by /astro/election/search. */
export interface ElectionResult {
  /** Caller-supplied stable id for keying. */
  id: string;
  /** Display "When" line, e.g. "Sun 21 Jun · 09:15". */
  when: string;
  /** Relative time hint, e.g. "in 18h". */
  relativeWhen?: string;
  /** "4 / 4 passed", "0 / 4 passed", etc. */
  passSummary?: string;
  /** 0..1 product score. Below 0.001 the row should render as a fail. */
  score: number;
  /** Per-constraint breakdown rendered when the row expands. */
  breakdown: ElectionBreakdownRow[];
  /** Pre-formatted score string ("0.74", "0.00"). Caller controls
   *  precision so we don't impose a locale. */
  scoreString: string;
  /** Optional status badge ("Excellent", "Strong", "Marginal"). */
  badge?: ElectionResultBadge;
}

export interface ElectionResultBadge {
  label: string;
  /** Token-resolved color for the pill. */
  color: string;
}

export interface ElectionBreakdownRow {
  /** Reference id for keying when reordering. */
  id: string;
  /** Slot for the constraint's glyph or icon. */
  icon: ReactNode;
  /** Token color for the icon background tint. */
  iconColor: string;
  /** The constraint as stated: "Moon hour in Cancer". */
  constraint: string;
  /** Human "Why this scored": "Moon in Cancer at 09:15 — exact". */
  reason: string;
  /** Pre-formatted per-constraint score ("1.00", "0.00", "0.62"). */
  scoreString: string;
  /** True if this row caused the overall product to go to zero. */
  failed?: boolean;
}

export interface ElectionRecipe {
  id: string;
  title: string;
  glyph: string;
  blurb: string;
  /** Editorial provenance — "Lilly, Christian Astrology vol. iii". */
  source?: string;
}
