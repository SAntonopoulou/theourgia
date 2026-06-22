/**
 * Practice Logs surface — H04 Tier 2 (fourth and final).
 *
 * Four practice logs (dream · pathworking · āsana & breath ·
 * banishing) clustered under one in-page tablist. Lives under the
 * Practice nav section; **not** under OracleTabs (these are not
 * divinations). The banishing log composes the cross-cutting
 * client-side-signing UX from H01-H03 via the Seal toggle.
 */

export {
  ASANA_BEGIN_LABEL,
  ASANA_BREATH_DEFAULT,
  ASANA_BREATH_LABEL,
  ASANA_DEFAULT_LOG,
  ASANA_DEFAULT_NAME,
  ASANA_LABEL,
  ASANA_NOTES_DEFAULT,
  ASANA_NOTES_LABEL,
  ASANA_NOTES_PLACEHOLDER,
  ASANA_PAUSE_LABEL,
  ASANA_RECENT_EYEBROW,
  ASANA_RESET_LABEL,
  ASANA_SAVE_LABEL,
  ASANA_STAT_HOURS,
  ASANA_STAT_HOURS_LABEL,
  ASANA_STAT_SESSIONS,
  ASANA_STAT_SESSIONS_LABEL,
  ASANA_TIMER_DEFAULT_SECONDS,
  BANISH_DEFAULT_LOG,
  BANISH_LOG_LABEL,
  BANISH_NOTE_PLACEHOLDER,
  BANISH_RECENT_EYEBROW,
  BANISH_RITE_OPTIONS,
  BANISH_SEAL_ACTIVE_LABEL,
  BANISH_SEAL_HELP_OFF,
  BANISH_SEAL_HELP_ON,
  BANISH_SEAL_LABEL,
  BANISH_SEALED_PILL,
  BANISH_TIME_DEFAULT,
  DREAM_ADD_CHIP_LABEL,
  DREAM_CHIPS_LABEL,
  DREAM_DEFAULT_CHIPS,
  DREAM_DEFAULT_LOG,
  DREAM_DEFAULT_TEXT,
  DREAM_FELT_SENSE_DEFAULT,
  DREAM_FELT_SENSE_LABEL,
  DREAM_HEADER,
  DREAM_LUCID_DEFAULT,
  DREAM_LUCID_LABEL,
  DREAM_LUCID_PILL,
  DREAM_RECENT_EYEBROW,
  DREAM_SAVE_LABEL,
  DREAM_TEXTAREA_PLACEHOLDER,
  DREAM_TIMESTAMP,
  PATH_ATTRIBUTION_LABEL,
  PATH_DEFAULT,
  PATH_INTEGRATION_LABEL,
  PATH_INTEGRATION_PLACEHOLDER,
  PATH_SAVE_LABEL,
  PATH_TREE_EYEBROW,
  PATH_TRUMP_LABEL,
  PATH_VISION_DEFAULT,
  PATH_VISION_LABEL,
  PATH_VISION_PLACEHOLDER,
  PRACTICE_LOG_TABLIST_LABEL,
  PRACTICE_LOG_TABS,
  PRACTICE_LOGS_SUBTITLE,
  PRACTICE_LOGS_TITLE,
  formatTimerSeconds,
} from "./copy.js";
export type {
  AsanaLogEntry,
  BanishingLogEntry,
  DreamChip,
  DreamChipKind,
  DreamLogEntry,
  PracticeLogTab,
  PracticeLogTabDef,
} from "./copy.js";

export { AsanaPanel } from "./AsanaPanel.js";
export type { AsanaPanelProps } from "./AsanaPanel.js";

export { BanishingPanel } from "./BanishingPanel.js";
export type { BanishingPanelProps } from "./BanishingPanel.js";

export { DreamPanel } from "./DreamPanel.js";
export type { DreamPanelProps } from "./DreamPanel.js";

export { LogTypeTablist } from "./LogTypeTablist.js";
export type { LogTypeTablistProps } from "./LogTypeTablist.js";

export { PathworkingPanel } from "./PathworkingPanel.js";
export type { PathworkingPanelProps } from "./PathworkingPanel.js";

export { PracticeLogsSurface } from "./PracticeLogsSurface.js";
export type { PracticeLogsSurfaceProps } from "./PracticeLogsSurface.js";
