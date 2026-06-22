/**
 * Runes surface — H04 Phase-06 Tier 2 (fourth).
 *
 * Composes the Runes engine from `../divination/runes` (B78b). The
 * symmetric-stave honesty rule (§S3.5) is enforced by the engine
 * (merkstave forced false for the 9 symmetric staves) and surfaced
 * by RuneReadingRail's symmetric callout.
 */

export {
  RUNES_CITATION,
  RUNES_DEFAULT_QUESTION,
  RUNES_DRAW_LABEL,
  RUNES_MERKSTAVE_PILL,
  RUNES_READING_PLACEHOLDER,
  RUNES_SAVE_CAPTION,
  RUNES_SAVE_LABEL,
  RUNES_SIZE_OPTIONS,
  RUNES_SUBTITLE,
  RUNES_SYMMETRIC_NOTE,
  RUNES_TRADITIONAL_EYEBROW,
  RUNES_YOUR_READING_EYEBROW,
} from "./copy.js";

export { RuneBoard } from "./RuneBoard.js";
export type { RuneBoardProps } from "./RuneBoard.js";

export { RuneReadingRail } from "./RuneReadingRail.js";
export type { RuneReadingRailProps } from "./RuneReadingRail.js";

export { RuneSizePicker } from "./RuneSizePicker.js";
export type { RuneSizePickerProps } from "./RuneSizePicker.js";

export { RuneTile } from "./RuneTile.js";
export type { RuneTileProps } from "./RuneTile.js";

export { RunesSurface } from "./RunesSurface.js";
export type { RunesSurfaceProps } from "./RunesSurface.js";
