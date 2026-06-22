/**
 * Voces Magicae surface — H05 Workshop · final surface.
 *
 * Vertical list + DetailDrawer + NewVoceModal. Source citation is
 * required (Save disabled until non-empty; chrome uses --accent
 * border, NEVER --danger).
 */

export {
  DEMO_VOCES,
  ELEMENTAL_COLOUR,
  ELEMENTAL_GLYPH,
  ELEMENTAL_NAME,
  IPA_KEYS,
  PLANETARY_GLYPH,
  PLANETARY_NAME,
  SCRIPT_OPTIONS,
  TRADITION_FILTERS,
  VM_ASSOCIATIONS_EYEBROW,
  VM_CITATION_LABEL,
  VM_CITATION_PLACEHOLDER,
  VM_CITATION_REQUIRED_NOTE,
  VM_CITATION_REQUIRED_TAG,
  VM_ELEMENTAL_LABEL,
  VM_EMPTY_RECORDINGS_NOTE,
  VM_IPA_LABEL,
  VM_IPA_OPTIONAL_TAG,
  VM_IPA_PLACEHOLDER,
  VM_NEW_BUTTON_LABEL,
  VM_NEW_CANCEL_LABEL,
  VM_NEW_DEFAULT_TEXT,
  VM_NEW_DEFAULT_TRANSLIT,
  VM_NEW_MODAL_TITLE,
  VM_NEW_SAVE_LABEL,
  VM_NO_RECORDING_LABEL,
  VM_PLANETARY_LABEL,
  VM_READONLY_PILL,
  VM_RECORDINGS_EYEBROW,
  VM_RECORD_NEW_LABEL,
  VM_SEARCH_PLACEHOLDER,
  VM_SOURCE_SCRIPT_LABEL,
  VM_TOPBAR_SUBTITLE,
  VM_TOPBAR_TITLE,
  VM_TRANSLITERATION_LABEL,
  VM_USED_IN_WORKINGS_EYEBROW,
  VM_VOCE_TEXT_LABEL,
  vmRecordingCountLabel,
} from "./copy.js";
export type {
  ElementalAssoc,
  PlanetaryAssoc,
  ScriptOption,
  TraditionDef,
  VoceEntity,
  VoceRecord,
  VoceRecording,
  VoceScript,
  VoceTradition,
  VoceWorking,
} from "./copy.js";

export { NewVoceModal } from "./NewVoceModal.js";
export type { NewVoceModalProps } from "./NewVoceModal.js";

export { VoceDetailDrawer } from "./VoceDetailDrawer.js";
export type { VoceDetailDrawerProps } from "./VoceDetailDrawer.js";

export { VoceRow } from "./VoceRow.js";
export type { VoceRowProps } from "./VoceRow.js";

export { VocesMagicaeSurface } from "./VocesMagicaeSurface.js";
export type { VocesMagicaeSurfaceProps } from "./VocesMagicaeSurface.js";

export { Waveform } from "./Waveform.js";
export type { WaveformProps } from "./Waveform.js";
