/**
 * Workshop SVG engines (H05).
 *
 * Pure-TS, headless modules the Workshop surfaces (Sigil Generator ·
 * Magic Squares · Talisman Designer · Magical Circle · Tool Registry ·
 * Voces Magicae Recorder) compose with chrome.
 *
 * Per the H05 supplement §S2.2: "Sigils, kamea paths, talisman
 * composites, and circles are functions of their parameters,
 * computed to SVG at render — never a stored bitmap treated as
 * truth." These modules are that function set.
 */

export {
  doublyEvenSquare,
  isValidMagicSquare,
  magicConstant,
  magicSquare,
  PLANETARY_SQUARES,
  planetarySquare,
  siameseSquare,
} from "./magicSquares.js";
export type { PlanetKey, PlanetarySquare } from "./magicSquares.js";

export { hebNum } from "./hebrew.js";

export { evalFormula } from "./evalFormula.js";
export type { EvalContext, EvalResult } from "./evalFormula.js";

export {
  hashSeed,
  mulberry32,
  sigilCurve,
  sigilGlyph,
  sigilKamea,
  spareLetters,
} from "./sigil.js";
export type {
  CurveFamily,
  SigilCurveParams,
  SigilGlyphResult,
  SigilKameaResult,
} from "./sigil.js";

export { centreSymbol, nameRingPath, printTiles } from "./geometry.js";
export type {
  CentreSymbol,
  CentreSymbolKind,
  NameRingPathResult,
  PrintTile,
  PrintTilesResult,
} from "./geometry.js";
