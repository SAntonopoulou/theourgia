/**
 * Festival glyph assignment.
 *
 * The backend registry deliberately carries no glyphs — they are
 * presentation. `Theourgia Calendar.dc.html` specifies glyphs for the
 * festivals it demonstrates (Vestalia ⚶ · Deipnon ☾ · Noumenia ☽ ·
 * Litha ☀); every other registered festival falls back to its
 * tradition's default mark. All characters sit in the `--font-glyph`
 * stack (Noto Sans Symbols → Cardo).
 */

import { type FestivalTradition } from "./festivals.js";

/** Per-festival overrides, design-specified first. */
export const FESTIVAL_GLYPHS: Record<string, string> = {
  vestalia: "⚶",
  deipnon: "☾",
  noumenia: "☽",
  litha: "☀",
  // Solar-station observances share the sun mark the design gave Litha.
  yule: "☀",
  ostara: "☀",
  mabon: "☀",
  "thel-spring-equinox": "☀",
  "thel-summer-solstice": "☀",
  "thel-autumn-equinox": "☀",
  "thel-winter-solstice": "☀",
};

/** Tradition fallback marks. */
export const TRADITION_GLYPHS: Record<FestivalTradition, string> = {
  woty: "❂",
  greek: "☽",
  roman: "⚶",
  hekatean: "☾",
  thelemic: "✶",
  hindu: "✦",
  egyptian: "✦",
};

export function festivalGlyph(
  festivalId: string,
  tradition: FestivalTradition,
): string {
  return FESTIVAL_GLYPHS[festivalId] ?? TRADITION_GLYPHS[tradition];
}
