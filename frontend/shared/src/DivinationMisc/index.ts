/**
 * Divination Misc surface — H04 Phase-06 "More" cluster.
 *
 * Four lighter methods (pendulum · bibliomancy · horary · scrying)
 * clustered under one OracleTabs entry via an in-page tablist (§S7.2
 * design decision).
 */

export {
  BIBLIO_DEFAULT_SOURCES,
  BIBLIO_LOG_LABEL,
  BIBLIO_METHOD_LABEL,
  BIBLIO_METHOD_NOTES,
  BIBLIO_OPEN_LABEL,
  BIBLIO_QUESTION_PLACEHOLDER,
  BIBLIO_SOURCE_LABEL,
  DIVMISC_METHOD_OPTIONS,
  DIVMISC_SUBTITLE,
  DIVMISC_TITLE,
  HORARY_DEFAULT_STEPS,
  HORARY_MOMENT_DEFAULT,
  HORARY_MOMENT_EYEBROW,
  HORARY_PROVISIONAL_DEFAULT,
  HORARY_PROVISIONAL_EYEBROW,
  HORARY_SAVE_LABEL,
  HORARY_STEPS_EYEBROW,
  HORARY_SYSTEM_CAPTION,
  PEND_ASK_LABEL,
  PEND_CALIBRATE_EYEBROW,
  PEND_CALIBRATE_NOTE,
  PEND_DEFAULT_NOTE,
  PEND_QUESTION_PLACEHOLDER,
  PEND_SESSION_LOG_EYEBROW,
  SCRY_AUDIO_HINT,
  SCRY_MEDIA_OPTIONS,
  SCRY_PAST_EYEBROW,
  SCRY_RECORD_LABEL,
  SCRY_SAVE_LABEL,
  SCRY_TEXT_PLACEHOLDER,
  SCRY_TRANCE_LABEL,
} from "./copy.js";
export type { DivMiscMethod, ScryMedium } from "./copy.js";

export { BibliomancyPanel } from "./BibliomancyPanel.js";
export type { BibliomancyPanelProps } from "./BibliomancyPanel.js";

export { DivinationMiscSurface } from "./DivinationMiscSurface.js";
export type { DivinationMiscSurfaceProps } from "./DivinationMiscSurface.js";

export { HoraryPanel } from "./HoraryPanel.js";
export type {
  HoraryPanelProps,
  HoraryStepRow,
} from "./HoraryPanel.js";

export { HoraryWheel } from "./HoraryWheel.js";
export type { HoraryWheelProps } from "./HoraryWheel.js";

export { MethodTablist } from "./MethodTablist.js";
export type { MethodTablistProps } from "./MethodTablist.js";

export { PendulumDial } from "./PendulumDial.js";
export type { PendulumDialProps } from "./PendulumDial.js";

export { PendulumPanel } from "./PendulumPanel.js";
export type {
  PendulumLogEntry,
  PendulumPanelProps,
} from "./PendulumPanel.js";

export { ScryingPanel } from "./ScryingPanel.js";
export type {
  ScrySessionLog,
  ScryingPanelProps,
} from "./ScryingPanel.js";

export { Speculum } from "./Speculum.js";
export type { SpeculumProps } from "./Speculum.js";
