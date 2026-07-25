/**
 * Tetraktys ladder — pure walk + figure geometry shared by the
 * Astragaloi ladder channel and the /order/ladder surface (H12,
 * Sprint F2).
 *
 * Source of truth mirrored from the backend
 * (``theourgia.models.curriculum`` + ``theourgia.core.divination.
 * astragaloi``):
 *
 *   • the serpent walk is FIXED: 10→9→8→7→4→5→6→3→2→1;
 *   • sphere names are the operator's Greek number names (10 is
 *     Hekate's — the Decad);
 *   • an astragaloi sum maps to its sphere as ``sum mod 10`` with
 *     0→10; octaves are luminous ≤10 / embodied 11–20 / chthonic
 *     21–30.
 *
 * The figure is ten points in four rows (1 / 2 / 3 / 4). Geometry
 * helpers return unit-free coordinates the SVG components scale.
 */

export type SphereNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type SphereState = "done" | "current" | "locked";

/** The fixed serpent order — descends from the tenth, returns to the first. */
export const SERPENT_ORDER: readonly SphereNumber[] = [10, 9, 8, 7, 4, 5, 6, 3, 2, 1];

/** The operator's Greek names per sphere number (backend SPHERE_NAMES). */
export const SPHERE_NAMES: Readonly<Record<SphereNumber, string>> = {
  1: "Monad",
  2: "Dyad",
  3: "Triad",
  4: "Tetrad",
  5: "Pentad",
  6: "Hexad",
  7: "Hebdomad",
  8: "Ogdoad",
  9: "Ennead",
  10: "Hekate / Decad",
};

/** The four rows of the figure, top to bottom. */
export const TETRAKTYS_ROWS: readonly (readonly SphereNumber[])[] = [
  [1],
  [2, 3],
  [4, 5, 6],
  [7, 8, 9, 10],
];

/** Astragaloi octave bands (H12 rule: ≤10 / 11–20 / 21–30). */
export type Octave = "luminous" | "embodied" | "chthonic";

/** Sphere for an astragaloi sum: ``sum mod 10``, 0→10. */
export function sphereForSum(sum: number): SphereNumber {
  const n = sum % 10 || 10;
  return n as SphereNumber;
}

/** Octave band for an astragaloi sum. */
export function octaveForSum(sum: number): Octave {
  if (sum <= 10) return "luminous";
  if (sum <= 20) return "embodied";
  return "chthonic";
}

export interface TetraktysPoint {
  number: SphereNumber;
  /** Row index 0..3, top to bottom. */
  row: number;
  /** Centre coordinates in the viewBox described by ``width``/``height``
   *  passed to :func:`tetraktysLayout`. */
  x: number;
  y: number;
}

export interface TetraktysLayout {
  width: number;
  height: number;
  points: readonly TetraktysPoint[];
  /** ``points`` keyed by sphere number. */
  byNumber: Readonly<Record<SphereNumber, TetraktysPoint>>;
  /** The serpent path as "x,y" pairs in SERPENT_ORDER — feed to a
   *  dashed ``<polyline points>``. */
  serpentPoints: string;
}

/**
 * Lay the ten points out in four rows for a ``width``×``height``
 * viewBox. ``top`` and ``rowGap`` default to comfortable values for
 * the given height; ``step`` is the horizontal spacing within a row.
 */
export function tetraktysLayout(
  width: number,
  height: number,
  opts?: { top?: number; rowGap?: number; step?: number },
): TetraktysLayout {
  const top = opts?.top ?? height * 0.13;
  const rowGap = opts?.rowGap ?? (height - 2 * top) / 3;
  const step = opts?.step ?? width * 0.24;
  const points: TetraktysPoint[] = [];
  TETRAKTYS_ROWS.forEach((row, ri) => {
    row.forEach((n, ci) => {
      points.push({
        number: n,
        row: ri,
        x: width / 2 + (ci - (row.length - 1) / 2) * step,
        y: top + ri * rowGap,
      });
    });
  });
  const byNumber = Object.fromEntries(points.map((p) => [p.number, p])) as Record<
    SphereNumber,
    TetraktysPoint
  >;
  const serpentPoints = SERPENT_ORDER.map((n) => {
    const p = byNumber[n];
    return `${p.x},${p.y}`;
  }).join(" ");
  return { width, height, points, byNumber, serpentPoints };
}
