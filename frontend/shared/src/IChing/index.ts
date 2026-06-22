/**
 * I Ching surface — H04 Phase-06 Tier 2 (second).
 *
 * Composes the I Ching engine from `../divination/iching` (B78c)
 * with the OracleTabs nav (B76). Coin and yarrow are the two casting
 * methods with deliberately different odds; the surface respects
 * yarrow's slower pacing by withholding the "Cast all six" shortcut
 * when yarrow is active (H04 §S3.2).
 */

export {
  CAST_INITIAL_PROMPT,
  ICHING_DEFAULT_QUESTION,
  ICHING_EMPTY_BODY,
  ICHING_SAVE_CAPTION,
  ICHING_STABLE_NOTE,
  ICHING_SUBTITLE,
  LINE_PLACE_NAMES,
  METHOD_NOTES,
  PLACEHOLDER_LINE_TEXT,
  WILHELM_BAYNES_CITATION,
  castProgressPrompt,
  lineName,
} from "./copy.js";

export { ChangingLinesPanel } from "./ChangingLinesPanel.js";
export type {
  ChangingLineCommentary,
  ChangingLinesPanelProps,
} from "./ChangingLinesPanel.js";

export { HexagramColumn } from "./HexagramColumn.js";
export type { HexagramColumnProps } from "./HexagramColumn.js";

export { HexagramHeading } from "./HexagramHeading.js";
export type { HexagramHeadingProps } from "./HexagramHeading.js";

export { IChingSurface } from "./IChingSurface.js";
export type { IChingHexagramText, IChingSurfaceProps } from "./IChingSurface.js";

export { MethodPicker } from "./MethodPicker.js";
export type { MethodPickerProps } from "./MethodPicker.js";
