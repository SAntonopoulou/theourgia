/**
 * Geomancy surface — H04 Phase-06 Tier 2 (third).
 *
 * Composes the Geomancy engine from `../divination/geomancy` (B78a)
 * with the OracleTabs nav (B76). The full shield + 12-house chart
 * are pure derivations from the four Mothers (the H04 §E worked
 * example "derived-cascade trap").
 */

export {
  DEFAULT_MOTHERS,
  GEO_METHOD_OPTIONS,
  GEOMANCY_DEFAULT_QUESTION,
  GEOMANCY_SUBTITLE,
  HOUSE_NUMERALS,
  HOUSE_TOPICS,
  HOUSES_EYEBROW,
  HOUSES_FOOTNOTE,
  LEFT_WITNESS_LABEL,
  MARK_AGAIN_LABEL,
  MOTHERS_EYEBROW,
  RECONCILER_LABEL,
  RIGHT_WITNESS_LABEL,
  SAVE_CHART_LABEL,
  SHIELD_EYEBROW,
} from "./copy.js";

export { GeoFigureView } from "./GeoFigureView.js";
export type { GeoFigureViewProps } from "./GeoFigureView.js";

export { GeoHouseChart } from "./GeoHouseChart.js";
export type { GeoHouseChartProps } from "./GeoHouseChart.js";

export { GeoShield } from "./GeoShield.js";
export type { GeoShieldProps } from "./GeoShield.js";

export { GeoVerdict } from "./GeoVerdict.js";
export type { GeoVerdictProps } from "./GeoVerdict.js";

export { GeomancySurface } from "./GeomancySurface.js";
export type {
  CastingMethod,
  GeomancySurfaceProps,
} from "./GeomancySurface.js";

export { MotherCell } from "./MotherCell.js";
export type { MotherCellProps } from "./MotherCell.js";
