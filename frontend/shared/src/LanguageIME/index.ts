export { LanguagePalette } from "./LanguagePalette.js";
export type { LanguagePaletteProps, PaletteScript } from "./LanguagePalette.js";
export {
  IAST_RULES,
  transliterateIast,
  type IastInputRule,
} from "./iastTransliterator.js";
export { devanagariToIast, iastToDevanagari } from "./devanagari.js";
export {
  canTransliterate,
  detectScript,
  isRtl,
  readingName,
  SCRIPT_LABELS,
  toLatin,
  toScript,
  TRANSLITERATION_SCRIPTS,
  type TransliterationScript,
} from "./phoneticInput.js";
export {
  library as transliterationLibrary,
  TransliterationLibrary,
  TransliterationScheme,
} from "./transliteration.js";
