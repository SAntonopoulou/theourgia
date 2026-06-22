/**
 * Magic Squares surface — H05 Workshop · second surface.
 *
 * The seven planetary kamea (Agrippa 1531) ship as immutable
 * fixtures; custom squares allowed at any order 3..12. View / Trace
 * / Build mode toggle. The Trace mode's "Save as sigil" forks a new
 * sigil row in the B91 Sigil Generator's Kamea mode — never mutates
 * the source square (H05 §S2.4 honesty).
 */

export {
  BUILD_ORDER_LABEL,
  BUILD_SAVE_LABEL,
  CUSTOM_NOTE,
  DEMO_CUSTOM_NAME,
  DEMO_CUSTOM_ORDER,
  META_CONSTANT_PREFIX,
  META_ORDER_PREFIX,
  MODE_BUILD,
  MODE_TRACE,
  MODE_VIEW,
  PLANETARY_CITATION,
  PLANET_NAMES,
  RAIL_CUSTOM_EYEBROW,
  RAIL_EMPTY_CUSTOM,
  RAIL_NEW_CUSTOM,
  RAIL_PLANETARY_EYEBROW,
  SELECTED_CELL_PREFIX,
  MS_TOPBAR_SUBTITLE,
  MS_TOPBAR_TITLE,
  TRACE_RESET,
  TRACE_SAVE_AS_SIGIL,
  TRACE_SAVE_GLYPH,
} from "./copy.js";
export type { MagicSquareMode, SquareId } from "./copy.js";

export { MagicSquaresSurface } from "./MagicSquaresSurface.js";
export type { MagicSquaresSurfaceProps } from "./MagicSquaresSurface.js";

export { PlanetaryRail } from "./PlanetaryRail.js";
export type {
  CustomSquareEntry,
  PlanetaryRailProps,
} from "./PlanetaryRail.js";

export { SquareView } from "./SquareView.js";
export type { SquareViewProps } from "./SquareView.js";
