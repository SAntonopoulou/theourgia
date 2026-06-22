/**
 * Tarot surface — H04 Phase-06 Tier 2 entry point.
 *
 * Composes the tarot engine from `../divination/tarot` (B78d) with
 * the OracleTabs nav (B76). Per H04 §S3.1, reversed cards render a
 * gentle ⟲ indicator only — NEVER red.
 */

export {
  TAROT_CARD_WIDTH,
  TAROT_DEFAULT_QUESTION,
  TAROT_EMPTY_RAIL,
  TAROT_READING_PLACEHOLDER,
  TAROT_RITUAL_PROMPT,
  TAROT_RWS_CITATION,
  TAROT_SPREAD_CHIPS,
} from "./copy.js";

export { CardReadingRail } from "./CardReadingRail.js";
export type { CardReadingRailProps } from "./CardReadingRail.js";

export { DeckPicker } from "./DeckPicker.js";
export type { DeckPickerProps } from "./DeckPicker.js";

export { QuestionBanner } from "./QuestionBanner.js";
export type { QuestionBannerProps } from "./QuestionBanner.js";

export { SPREAD_BOARD_HEIGHT, SpreadBoard } from "./SpreadBoard.js";
export type { SpreadBoardProps } from "./SpreadBoard.js";

export { SpreadPicker } from "./SpreadPicker.js";
export type { SpreadPickerProps } from "./SpreadPicker.js";

export { TarotCardFace } from "./TarotCardFace.js";
export type { TarotCardFaceProps } from "./TarotCardFace.js";

export { TarotHistoryRow } from "./TarotHistoryRow.js";
export type { TarotHistoryRowProps } from "./TarotHistoryRow.js";

export { TarotSurface } from "./TarotSurface.js";
export type {
  TarotPastReading,
  TarotSurfaceProps,
  TarotView,
} from "./TarotSurface.js";
