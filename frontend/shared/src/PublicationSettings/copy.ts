/**
 * Editorial copy for the Publication Settings surface
 * (H07 §S3 surface 6).
 *
 * Single-column form with five sections: Identity · Cover & summary ·
 * Schedule · Distribution · Discoverability.
 *
 * Honesty rules wired into the copy:
 *   • Slug carries the `‡` "URLs are stable forever" microcopy.
 *   • Scheduled help text is verbatim from the .dc.html.
 *   • ActivityPub distribution row carries the explicit
 *     Phase-12 deferral note.
 *   • Tradition tags vs free-text tags are kept distinct in the
 *     section headings to avoid drift.
 */

export const PS_TITLE = "Publication settings";
export const PS_SUBTITLE =
  "How this work ships — identity, cover, schedule, where it appears.";

export const PS_IDENTITY_HEADING = "Identity";
export const PS_TITLE_LABEL = "Title";
export const PS_SLUG_LABEL = "Slug";
export const PS_SLUG_NOTE =
  "URLs are stable forever — pick a slug you can live with.";
export const PS_AUTHORS_LABEL = "Authors";
export const PS_ADD_AUTHOR = "+ add author";

export const PS_COVER_HEADING = "Cover & summary";
export const PS_COVER_LABEL = "Cover";
export const PS_SUMMARY_LABEL = "Summary";

export const PS_SCHEDULE_HEADING = "Schedule";
export const PS_SCHED_NOW = "Publish now";
export const PS_SCHED_LATER = "Schedule for…";
export const PS_SCHED_NOTE =
  "Scheduled publications appear in your vault's public face at the chosen moment.";

export const PS_DISTRIBUTION_HEADING = "Distribution";
export const PS_DIST_CATALOG = "Your vault's public catalog";
export const PS_DIST_RSS = "RSS feed";
export const PS_DIST_ACTIVITYPUB = "ActivityPub announcement";
export const PS_DIST_AP_NOTE = "Available when Federation ships";
export const PS_DIST_NEWSLETTER = "Include in next newsletter";

export const PS_DISCOVER_HEADING = "Discoverability";
export const PS_TAGS_LABEL = "Tags";
export const PS_TAGS_TAIL = "· practitioner-coined";
export const PS_TRADITION_LABEL = "Tradition tags";
export const PS_TRADITION_TAIL = "· from a controlled list";
export const PS_ADD_TAG = "+ add";
export const PS_PICK_TRADITION = "+ pick tradition";

export const PS_TRADITION_OPTIONS: { value: string; label: string; glyph: string }[] = [
  { value: "hellenic", label: "Hellenic", glyph: "☽" },
  { value: "thelemic", label: "Thelemic", glyph: "✶" },
  { value: "hermetic", label: "Hermetic", glyph: "☿" },
  { value: "kabbalistic", label: "Kabbalistic", glyph: "א" },
  { value: "wiccan", label: "Wiccan", glyph: "☾" },
  { value: "chaos", label: "Chaos magick", glyph: "⊕" },
  { value: "goetic", label: "Goetic", glyph: "✦" },
  { value: "celtic", label: "Celtic", glyph: "᛬" },
  { value: "vedic", label: "Vedic", glyph: "ॐ" },
  { value: "norse", label: "Norse", glyph: "ᚠ" },
  { value: "general", label: "General / cross-tradition", glyph: "·" },
];

/** Estimate reading time in minutes for a publication body
 *  (~240 words/min for serif prose). Surfaces as a quiet stat
 *  next to the summary character count. */
export function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 240));
}
