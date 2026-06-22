/**
 * Talisman Designer surface — H05 §E worked example.
 *
 * The deepest H05 composition: 4-zone (topbar w/ Front/Back tablist
 * · 280px layer rail · 600 composite canvas · 340px metadata rail)
 * + election picker modal + sealed save dialog. Composes B92
 * planetary squares (kamea embed) + B90 nameRingPath (textPath
 * textLength gotcha) + the --seal client-side encryption discipline.
 */

export {
  ADD_INSCRIPTION_LABEL,
  ADD_SIGIL_LABEL,
  BACKGROUND_TEXTURE_NOTE,
  BACKGROUND_TEXTURES,
  BORDER_INSCRIPTION_DEFAULT,
  BORDER_STYLES,
  DEMO_ELECTIONS,
  DEMO_INSCRIPTIONS,
  DEMO_LAYER_SIGILS,
  ELECTION_MODAL_SUB,
  ELECTION_MODAL_TITLE,
  ELECTION_PREVIEW_DETAIL,
  ELECTION_PREVIEW_GLYPH,
  ELECTION_PREVIEW_WHEN,
  ELECTION_SEARCH_PLACEHOLDER,
  FACE_BACK_LABEL,
  FACE_FRONT_LABEL,
  FACE_TABLIST_LABEL,
  LAYERS_EYEBROW_PREFIX,
  LINKED_ELECTION_FOOTER,
  LINKED_ELECTION_LABEL,
  LINKED_WORKING_CTA,
  TL_LINKED_WORKING_LABEL,
  MATERIALS_DEFAULT,
  MATERIALS_LABEL,
  MATERIALS_PLACEHOLDER,
  MIRROR_TO_BACK,
  MIRROR_TO_FRONT,
  NAME_LABEL,
  PURPOSE_DEFAULT,
  PURPOSE_LABEL,
  TL_SAVE_CANCEL,
  TL_SAVE_CONFIRM,
  TL_SAVE_DIALOG_PERMANENCE,
  TL_SAVE_DIALOG_TITLE,
  SAVE_TALISMAN_BUTTON,
  TL_SAVE_TITLE_LABEL,
  SEAL_HELP_OFF,
  SEAL_HELP_ON,
  SEAL_SWITCH_LABEL,
  SETTINGS_EYEBROW_TAIL,
  SNAP_GRID_LABEL,
  SNAP_GUIDES_CAPTION,
  SQUARE_PICKER_OPTIONS,
  SQUARE_POSITIONS,
  TALISMAN_LAYERS,
  THIS_TALISMAN_EYEBROW,
  TOPBAR_DEFAULT_NAME,
  UPLOAD_IMAGE_LABEL,
  Z_ORDER_HINT,
  layerByKey,
  layersEyebrow,
  mirrorLabel,
} from "./copy.js";
export type {
  ElectionRow,
  InscriptionRef,
  SigilRef,
  TalismanFace,
  TalismanLayerDef,
  TalismanLayerKind,
} from "./copy.js";

export { ElectionPickerModal } from "./ElectionPickerModal.js";
export type { ElectionPickerModalProps } from "./ElectionPickerModal.js";

export { FaceTablist } from "./FaceTablist.js";
export type { FaceTablistProps } from "./FaceTablist.js";

export { LayerConfig } from "./LayerConfig.js";
export type { LayerConfigProps } from "./LayerConfig.js";

export { LayerPanel } from "./LayerPanel.js";
export type { LayerPanelProps } from "./LayerPanel.js";

export { SealedSaveDialog } from "./SealedSaveDialog.js";
export type { SealedSaveDialogProps } from "./SealedSaveDialog.js";

export { TalismanCanvas } from "./TalismanCanvas.js";
export type { TalismanCanvasProps } from "./TalismanCanvas.js";

export { TalismanDesignerSurface } from "./TalismanDesignerSurface.js";
export type { TalismanDesignerSurfaceProps } from "./TalismanDesignerSurface.js";
