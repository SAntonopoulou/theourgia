/**
 * Daily Practice Tracker — H04 Tier 1 surface.
 *
 * Self-set ritual companion to Liber Resh. Multiple practices coexist,
 * quiet streaks (never gamified), skipped days are information not
 * failure. Composes the streak() helper from ../practice.
 */

export {
  CADENCE_OPTIONS,
  EMPTY_STATE_BODY,
  EMPTY_STATE_CTA,
  EMPTY_STATE_TITLE,
  PRACTICE_STATUS_HEADLINE,
  PRACTICE_STATUS_SUB,
  STREAK_CELL_TITLE,
  TODAY_CHIP_LABEL,
} from "./copy.js";
export type { CadenceOption } from "./copy.js";

export { DailyPracticeTracker } from "./DailyPracticeTracker.js";
export type {
  DailyPractice,
  DailyPracticeTrackerProps,
} from "./DailyPracticeTracker.js";

export { DefinePracticeDrawer } from "./DefinePracticeDrawer.js";
export type {
  DefinePracticeDraft,
  DefinePracticeDrawerProps,
} from "./DefinePracticeDrawer.js";

export { Last7DaysDots } from "./Last7DaysDots.js";
export type { Last7DaysDotsProps } from "./Last7DaysDots.js";

export { PracticeCard } from "./PracticeCard.js";
export type { PracticeCardProps } from "./PracticeCard.js";

export { PracticeStatusIcon } from "./PracticeStatusIcon.js";
export type { PracticeStatusIconProps } from "./PracticeStatusIcon.js";

export { StreakGrid35 } from "./StreakGrid35.js";
export type { StreakGrid35Props } from "./StreakGrid35.js";

export { TodayStatusChip } from "./TodayStatusChip.js";
export type { TodayStatusChipProps } from "./TodayStatusChip.js";
