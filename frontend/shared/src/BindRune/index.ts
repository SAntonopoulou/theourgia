/**
 * Bind-rune designer — v1-007 (FEATURES §4: "spreads incl. bind-rune
 * designer").
 *
 * Client-side compose + SVG export only: `Sigil.mode` is a closed
 * Postgres enum, so bind-rune persistence waits for a migration in a
 * later batch. The canvas layers Unicode rune glyphs (`--font-rune`)
 * over an optional central stave — the honest v1 approach, noted on
 * the surface itself.
 */

export {
  BR_CANVAS_EMPTY_LABEL,
  BR_COMPOSITION_EMPTY,
  BR_COMPOSITION_EYEBROW,
  BR_DOWNLOAD_FILENAME,
  BR_DOWNLOAD_SVG,
  BR_METHOD_NOTE,
  BR_MIRROR_LABEL,
  BR_OPACITY_LABEL,
  BR_RAIL_EYEBROW,
  BR_RAIL_HINT,
  BR_RAIL_SET_LABEL,
  BR_REMOVE_LABEL,
  BR_ROTATE_LABEL,
  BR_RUNE_FONT_STACK,
  BR_SCALE_LABEL,
  BR_STAVE_TOGGLE,
  BR_STROKE_LABEL,
  BR_STROKE_OPTIONS,
  BR_TOPBAR_SUBTITLE,
  BR_TOPBAR_TITLE,
  bindRuneCanvasLabel,
} from "./copy.js";
export type { BindRuneStrokeKey } from "./copy.js";

export type {
  BindRuneGlyph,
  BindRuneLayer,
  BindRuneRotation,
  BindRuneSetDetail,
  BindRuneSetSummary,
} from "./types.js";

export { BindRuneDesignerSurface } from "./BindRuneDesignerSurface.js";
export type { BindRuneDesignerSurfaceProps } from "./BindRuneDesignerSurface.js";
