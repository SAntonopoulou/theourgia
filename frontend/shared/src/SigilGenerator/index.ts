/**
 * Sigil Generator surface — H05 Workshop · first surface.
 *
 * Eleven generation modes; non-destructive operations toolbar;
 * committed-make save (read-only on reopen + Edit a new version);
 * library panel; personal owned-deck overlay (never persisted).
 * Composes the B90 workshop engines for the actual SVG generation.
 */

export {
  CARRIES_EYEBROW,
  CHARGE_SAVE_BUTTON,
  CONFIG_LABELS,
  CONFIG_PLACEHOLDER_PROMPT,
  FORMULA_DEFAULT,
  FORMULA_HELP,
  GEMATRIA_CIPHERS,
  GREEK_STYLES,
  HEBREW_STYLES,
  INTENTION_DEFAULT,
  INTENTION_LABEL,
  INTENTION_PLACEHOLDER,
  LIBRARY_DEMO_NAMES,
  LIBRARY_HEADER,
  LIBRARY_HELP_TAIL,
  LINKED_BEING_DEFAULT,
  LINKED_BEING_LABEL,
  LINKED_WORKING_LABEL,
  LINKED_WORKING_PLACEHOLDER,
  MODE_RAIL_EYEBROW,
  NOTES_LABEL,
  NOTES_PLACEHOLDER,
  OPTIONAL_TAG,
  OPERATION_MIRROR,
  OPERATION_RENAME,
  OPERATION_RESIZE,
  OPERATION_ROTATE,
  OPERATION_SIMPLIFY,
  OPERATIONS_EYEBROW,
  OWNED_DECK_CONFIRM,
  OWNED_DECK_OWNERSHIP_LABEL,
  OWNED_DECK_SUB,
  OWNED_DECK_TITLE,
  OWNED_DECK_UPLOAD_LABEL,
  OWNED_DECK_WARN,
  PLANETARY_TILES,
  RECOLOR_SWATCHES,
  ROSE_SCRIPTS,
  ROSETTE_VARIANTS,
  SAVE_CANCEL,
  SAVE_COMMIT,
  SAVE_DIALOG_PERMANENCE,
  SAVE_DIALOG_TITLE,
  SAVE_LAYER_OTHER,
  SAVE_PURPOSE_LABEL,
  SAVE_TITLE_DEFAULT,
  SAVE_TITLE_LABEL,
  SIGIL_CURVE_FAMILIES,
  SIGIL_EXPORT_FORMATS,
  SIGIL_MODES,
  SIGIL_MODE_CITATIONS,
  SIGIL_PURPOSE_CHIPS,
  SPARE_TOGGLE_LABEL,
  TOPBAR_SUBTITLE_TAIL,
  TOPBAR_TITLE,
  modeCitation,
  modeLabel,
} from "./copy.js";
export type {
  PlanetaryTile,
  SigilCurveOption,
  SigilExportFormat,
  SigilMode,
  SigilModeDef,
  SigilPurpose,
  SigilPurposeChip,
} from "./copy.js";

export { CarriesPanel } from "./CarriesPanel.js";
export type { CarriesPanelProps } from "./CarriesPanel.js";

export { ChargeSaveDialog } from "./ChargeSaveDialog.js";
export type { ChargeSaveDialogProps } from "./ChargeSaveDialog.js";

export { ConfigPanel } from "./ConfigPanel.js";
export type { ConfigPanelProps } from "./ConfigPanel.js";

export { ExportMenu } from "./ExportMenu.js";
export type { ExportMenuProps } from "./ExportMenu.js";

export { ModeRail } from "./ModeRail.js";
export type { ModeRailProps } from "./ModeRail.js";

export { OperationsToolbar } from "./OperationsToolbar.js";
export type { OperationsToolbarProps } from "./OperationsToolbar.js";

export { OwnedDeckOverlay } from "./OwnedDeckOverlay.js";
export type { OwnedDeckOverlayProps } from "./OwnedDeckOverlay.js";

export { SigilGeneratorSurface } from "./SigilGeneratorSurface.js";
export type { SigilGeneratorSurfaceProps } from "./SigilGeneratorSurface.js";

export { SigilLibraryPanel } from "./SigilLibraryPanel.js";
export type {
  SigilLibraryEntry,
  SigilLibraryPanelProps,
} from "./SigilLibraryPanel.js";

export { SigilPreview } from "./SigilPreview.js";
export type {
  SigilOperations,
  SigilPreviewProps,
} from "./SigilPreview.js";
