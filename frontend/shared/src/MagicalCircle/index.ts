/**
 * Magical Circle surface — H05 Workshop · fourth surface.
 *
 * Composes B90 centreSymbol (4 of 7 centre kinds) + nameRingPath
 * (inscription rings). PD preset library loads as mutable copy with
 * no back-link to source.
 */

export {
  BLANK_NOTE,
  CENTRE_ELEMENT_EYEBROW,
  CENTRE_OPTIONS,
  COMPASS_DEFINITIONS,
  COMPASS_ORDER,
  COMPASS_POINTS_EYEBROW,
  COMPASS_TRADITION_NOTE,
  DEFAULT_DIAMETER_M,
  DIAMETER_LABEL,
  GLYPH_SETS,
  GLYPH_SET_LABEL,
  IMAGE_KIND_LABEL,
  IMAGE_UPLOAD_LABEL,
  INSCRIPTION_DEFAULT,
  INSCRIPTION_DIRECTIONS,
  INSCRIPTION_DIRECTION_LABEL,
  INSCRIPTION_SCRIPTS,
  INSCRIPTION_SCRIPT_LABEL,
  INSCRIPTION_TEXT_LABEL,
  MC_KIND_LABEL,
  LIBRARY_MODAL_SUB,
  LIBRARY_MODAL_TITLE,
  LIBRARY_PRESETS,
  MC_TOPBAR_DEFAULT_NAME,
  MULTI_DEMO_SEQUENCE,
  MULTI_EDIT_LABEL,
  MULTI_SEQUENCE_LABEL,
  OPEN_FROM_LIBRARY,
  PRINT_TILE_LABEL,
  RING_CONTENT_SUFFIX,
  RING_KINDS,
  RING_KIND_PREVIEW,
  RINGS_EYEBROW,
  ROTATION_LABEL,
  SAVE_CIRCLE_BUTTON,
  USED_IN_NOTE_PREFIX,
  USED_IN_NOTE_TAIL,
  ringKindLabel,
  ringLabels,
} from "./copy.js";
export type {
  CentreElement,
  CentreOption,
  CirclePreset,
  CompassDefinition,
  CompassTradition,
  RingKind,
  RingKindOption,
} from "./copy.js";

export { CentrePicker } from "./CentrePicker.js";
export type { CentrePickerProps } from "./CentrePicker.js";

export { CirclePreview } from "./CirclePreview.js";
export type {
  CirclePreviewProps,
  RingState,
} from "./CirclePreview.js";

export { MagicalCircleSurface } from "./MagicalCircleSurface.js";
export type { MagicalCircleSurfaceProps } from "./MagicalCircleSurface.js";

export { PresetCircleLibrary } from "./PresetCircleLibrary.js";
export type { PresetCircleLibraryProps } from "./PresetCircleLibrary.js";

export { RingConfig } from "./RingConfig.js";
export type { RingConfigProps } from "./RingConfig.js";

export { RingsCompassRail } from "./RingsCompassRail.js";
export type { RingsCompassRailProps } from "./RingsCompassRail.js";
