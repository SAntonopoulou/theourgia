/**
 * Practice helpers for Phase 06 practice surfaces (H04 handoff).
 *
 * Headless data + math: Tree of Life path correspondences, sephiroth
 * layout, and the streak helper for Daily Practice + āsana logs.
 * Ports verbatim from the mockups; never gamified.
 */

export {
  SEPHIROTH,
  SEPHIROTH_BY_NAME,
  TREE_OF_LIFE_PATH_NUMBERS,
  TREE_OF_LIFE_PATHS,
  pathByNumber,
} from "./treeOfLife.js";
export type {
  SephirahName,
  SephirahNode,
  TreeOfLifePath,
} from "./treeOfLife.js";

export { countKept, streak } from "./streak.js";
export type { CompletionStatus, TodayStatus } from "./streak.js";

export {
  SERPENT_ORDER,
  SPHERE_NAMES,
  TETRAKTYS_ROWS,
  octaveForSum,
  sphereForSum,
  tetraktysLayout,
} from "./tetraktys.js";
export type {
  Octave,
  SphereNumber,
  SphereState,
  TetraktysLayout,
  TetraktysPoint,
} from "./tetraktys.js";
