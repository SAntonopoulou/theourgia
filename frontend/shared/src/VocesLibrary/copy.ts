/**
 * Editorial copy for the Voces Magicae Library Browser (H06 §S6.4).
 *
 * Voice: scholarly + reverent. The voces are sacred text from
 * antiquity. The chrome respects that weight without performance.
 */

export const VL_TOPBAR_TITLE = "Voces Magicae Library";
export const VL_TOPBAR_SUBTITLE =
  "The canonical names, and the ones you've made your own";

export const VL_SEARCH_PLACEHOLDER = "Search name, text, transliteration…";

export const VL_TRADITION_LABELS: Record<string, string> = {
  all: "All",
  pgm: "PGM",
  hekate: "Hekate",
  goetic: "Goetic",
  solomonic: "Solomonic",
  thelemic: "Thelemic",
  vedic: "Vedic",
  norse: "Norse",
  heptameron: "Heptameron",
  sefer: "Sefer Yetzirah",
  custom: "Custom",
};

export const VL_SOURCE_LABELS: Record<string, string> = {
  all: "All",
  bundled: "Bundled",
  personal: "Personal",
};

export const VL_BUNDLED_TITLE = "From the canonical library";
export const VL_PERSONAL_BADGE = "personal";

export const VL_DRAWER_BUNDLED_LABEL = "Bundled · canonical library";
export const VL_DRAWER_PERSONAL_LABEL = "Personal · your library";

export const VL_PLAY_LABEL = "Play pronunciation";
export const VL_SLOW_LABEL = "Slow (0.6×)";

export const VL_ASSOCIATIONS_EYEBROW = "Associations";
export const VL_RECORDINGS_EYEBROW = "Community recordings";
export const VL_RECORDINGS_DISCLAIMER =
  "Community recordings represent how individual practitioners voice this voce — not a canonical authority.";

export const VL_PRIVATE_NOTE_EYEBROW = "Why I learned this voce";
export const VL_PRIVATE_NOTE_TAIL = "· private to your vault";
export const VL_PRIVATE_NOTE_PLACEHOLDER =
  "A personal note — kept against this voce without forking it…";

export const VL_USED_IN_EYEBROW = "Used in workings";

export const VL_FORK_LABEL = "Fork into my library";
export const VL_INSERT_LABEL = "Insert reference into draft";
export const VL_SUGGEST_LABEL = "Suggest correction";

export const VL_EMPTY_HEADING = "no voces match";
export const VL_EMPTY_BODY =
  "Try a different tradition filter, or clear the search above.";

// Recording count copy.
export const VL_NO_RECORDING = "no recording yet";
export function communityRecordingLabel(n: number): string {
  return n === 1
    ? "1 community recording"
    : `${n} community recordings`;
}
export function personalRecordingLabel(n: number): string {
  return n === 1
    ? "1 personal recording"
    : `${n} personal recordings`;
}

// Suggest-correction modal.
export const VL_SUGGEST_TITLE = "Suggest a correction";
export const VL_SUGGEST_REASON_LABEL = "What needs correcting";
export const VL_SUGGEST_REASONS = [
  "Pronunciation",
  "Transliteration",
  "Citation",
  "Other",
];
export const VL_SUGGEST_DETAIL_LABEL = "Detail";
export const VL_SUGGEST_DETAIL_PLACEHOLDER =
  "What you observed, and your source if you have one…";
export const VL_SUGGEST_EMAIL_LABEL_PREFIX = "Your email";
export const VL_SUGGEST_EMAIL_LABEL_TAIL = "· optional";
export const VL_SUGGEST_EMAIL_PLACEHOLDER =
  "If you'd like to be reached about it";
export const VL_SUGGEST_CANCEL = "Cancel";
export const VL_SUGGEST_QUEUE = "Queue correction";
export const VL_SUGGEST_FOOTER =
  "The review pipeline ships with the community-contribution layer (Phase 14).";

// Derive a tradition slug from a citation string. Heuristic only —
// when Phase 08 backend ships, voces carry a tradition tag field
// directly and this derivation goes away.
export function deriveTradition(citation: string): string {
  const lower = citation.toLowerCase();
  if (lower.includes("pgm") || lower.includes("preisendanz")) return "pgm";
  if (lower.includes("hekate")) return "hekate";
  if (lower.includes("heptameron")) return "heptameron";
  if (lower.includes("sefer yetzirah")) return "sefer";
  if (lower.includes("lemegeton") || lower.includes("goetia")) return "goetic";
  if (lower.includes("solomon")) return "solomonic";
  if (lower.includes("crowley") || lower.includes("thelema")) return "thelemic";
  if (lower.includes("veda") || lower.includes("sanskrit") || lower.includes("ṛgveda")) return "vedic";
  if (lower.includes("norse") || lower.includes("eddas")) return "norse";
  return "custom";
}
