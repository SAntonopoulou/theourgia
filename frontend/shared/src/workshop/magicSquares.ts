/**
 * Magic squares — the seven planetary kamea (Agrippa 1531) ship as
 * exact traditional fixtures. Odd-order custom squares use the
 * Siamese method; doubly-even (multiples of 4) use the Dürer-style
 * diagonal-complement method.
 *
 * Per the H05 supplement §D + §S6 note: "ship the exact traditional
 * arrays for all seven as fixtures." Algorithmic constructors stay
 * for **custom** squares the practitioner builds at non-traditional
 * orders.
 *
 * Cite: Cornelius Agrippa, *De Occulta Philosophia Libri Tres*,
 * book II chapter XXII (1531). The seven planetary squares + their
 * traditional sigils. Values verified row/col/diagonal-sum at the
 * test layer.
 */

export type PlanetKey =
  | "saturn"
  | "jupiter"
  | "mars"
  | "sun"
  | "venus"
  | "mercury"
  | "moon";

export interface PlanetarySquare {
  planet: PlanetKey;
  name: string;
  order: number;
  cells: readonly (readonly number[])[];
  magicConstant: number;
  citation: { kind: "primary"; label: string; cite: string };
}

/** n(n² + 1) / 2 — the magic constant for a normal magic square. */
export function magicConstant(order: number): number {
  return (order * (order * order + 1)) / 2;
}

const AGRIPPA_CITE = {
  kind: "primary" as const,
  label: "Agrippa 1531",
  cite: "Cornelius Agrippa, De Occulta Philosophia book II ch. XXII (1531)",
};

/* ─── Saturn (3×3) ─────────────────────────────────────────────────────── */

const SATURN: readonly (readonly number[])[] = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

/* ─── Jupiter (4×4) ────────────────────────────────────────────────────── */

const JUPITER: readonly (readonly number[])[] = [
  [4, 14, 15, 1],
  [9, 7, 6, 12],
  [5, 11, 10, 8],
  [16, 2, 3, 13],
];

/* ─── Mars (5×5) ───────────────────────────────────────────────────────── */

const MARS: readonly (readonly number[])[] = [
  [11, 24, 7, 20, 3],
  [4, 12, 25, 8, 16],
  [17, 5, 13, 21, 9],
  [10, 18, 1, 14, 22],
  [23, 6, 19, 2, 15],
];

/* ─── Sol (6×6) ────────────────────────────────────────────────────────── */

const SOL: readonly (readonly number[])[] = [
  [6, 32, 3, 34, 35, 1],
  [7, 11, 27, 28, 8, 30],
  [19, 14, 16, 15, 23, 24],
  [18, 20, 22, 21, 17, 13],
  [25, 29, 10, 9, 26, 12],
  [36, 5, 33, 4, 2, 31],
];

/* ─── Venus (7×7) ──────────────────────────────────────────────────────── */

const VENUS: readonly (readonly number[])[] = [
  [22, 47, 16, 41, 10, 35, 4],
  [5, 23, 48, 17, 42, 11, 29],
  [30, 6, 24, 49, 18, 36, 12],
  [13, 31, 7, 25, 43, 19, 37],
  [38, 14, 32, 1, 26, 44, 20],
  [21, 39, 8, 33, 2, 27, 45],
  [46, 15, 40, 9, 34, 3, 28],
];

/* ─── Mercury (8×8) ────────────────────────────────────────────────────── */

const MERCURY: readonly (readonly number[])[] = [
  [8, 58, 59, 5, 4, 62, 63, 1],
  [49, 15, 14, 52, 53, 11, 10, 56],
  [41, 23, 22, 44, 45, 19, 18, 48],
  [32, 34, 35, 29, 28, 38, 39, 25],
  [40, 26, 27, 37, 36, 30, 31, 33],
  [17, 47, 46, 20, 21, 43, 42, 24],
  [9, 55, 54, 12, 13, 51, 50, 16],
  [64, 2, 3, 61, 60, 6, 7, 57],
];

/* ─── Luna (9×9) ───────────────────────────────────────────────────────── */

const LUNA: readonly (readonly number[])[] = [
  [37, 78, 29, 70, 21, 62, 13, 54, 5],
  [6, 38, 79, 30, 71, 22, 63, 14, 46],
  [47, 7, 39, 80, 31, 72, 23, 55, 15],
  [16, 48, 8, 40, 81, 32, 64, 24, 56],
  [57, 17, 49, 9, 41, 73, 33, 65, 25],
  [26, 58, 18, 50, 1, 42, 74, 34, 66],
  [67, 27, 59, 10, 51, 2, 43, 75, 35],
  [36, 68, 19, 60, 11, 52, 3, 44, 76],
  [77, 28, 69, 20, 61, 12, 53, 4, 45],
];

/* ─── The seven, in the sacred planetary order (Saturn → Moon) ──────── */

/** Sacred order — Saturn → Jupiter → Mars → Sol → Venus → Mercury → Luna.
 *  Do not re-sort by size or planet attribution.
 */
export const PLANETARY_SQUARES: readonly PlanetarySquare[] = [
  {
    planet: "saturn",
    name: "Saturn",
    order: 3,
    cells: SATURN,
    magicConstant: 15,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "jupiter",
    name: "Jupiter",
    order: 4,
    cells: JUPITER,
    magicConstant: 34,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "mars",
    name: "Mars",
    order: 5,
    cells: MARS,
    magicConstant: 65,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "sun",
    name: "Sol",
    order: 6,
    cells: SOL,
    magicConstant: 111,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "venus",
    name: "Venus",
    order: 7,
    cells: VENUS,
    magicConstant: 175,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "mercury",
    name: "Mercury",
    order: 8,
    cells: MERCURY,
    magicConstant: 260,
    citation: AGRIPPA_CITE,
  },
  {
    planet: "moon",
    name: "Luna",
    order: 9,
    cells: LUNA,
    magicConstant: 369,
    citation: AGRIPPA_CITE,
  },
];

export function planetarySquare(planet: PlanetKey): PlanetarySquare {
  const s = PLANETARY_SQUARES.find((p) => p.planet === planet);
  if (!s) throw new Error(`Unknown planet: ${planet}`);
  return s;
}

/* ─── Magic-square verification ──────────────────────────────────────── */

/** Verifies every row, column, and both diagonals sum to the magic
 *  constant. Returns `true` iff the square is a normal magic square
 *  containing exactly the values 1..n². */
export function isValidMagicSquare(
  cells: readonly (readonly number[])[],
): boolean {
  const n = cells.length;
  if (n < 3) return false;
  if (cells.some((row) => row.length !== n)) return false;
  const k = magicConstant(n);
  // Values are 1..n² exactly once each.
  const seen = new Set<number>();
  for (const row of cells) {
    for (const v of row) {
      if (!Number.isInteger(v) || v < 1 || v > n * n) return false;
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }
  if (seen.size !== n * n) return false;
  // Row sums.
  for (const row of cells) {
    if (row.reduce((a, b) => a + b, 0) !== k) return false;
  }
  // Column sums.
  for (let c = 0; c < n; c++) {
    let sum = 0;
    for (let r = 0; r < n; r++) sum += cells[r]![c]!;
    if (sum !== k) return false;
  }
  // Diagonals.
  let d1 = 0;
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    d1 += cells[i]![i]!;
    d2 += cells[i]![n - 1 - i]!;
  }
  if (d1 !== k || d2 !== k) return false;
  return true;
}

/* ─── Siamese (odd-order) construction ───────────────────────────────── */

/** Constructs a normal magic square of odd order via the Siamese
 *  method (de la Loubère). Start at the top-middle cell with 1; for
 *  each next number step up-and-right with wrap; if that cell is
 *  taken, step down one row instead.
 */
export function siameseSquare(order: number): number[][] {
  if (order < 3 || order % 2 === 0) {
    throw new Error(
      `siameseSquare needs an odd order >= 3 (got ${order})`,
    );
  }
  const n = order;
  const grid: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0),
  );
  let row = 0;
  let col = Math.floor(n / 2);
  for (let num = 1; num <= n * n; num++) {
    grid[row]![col] = num;
    const nextRow = (row - 1 + n) % n;
    const nextCol = (col + 1) % n;
    if (grid[nextRow]![nextCol] !== 0) {
      row = (row + 1) % n;
    } else {
      row = nextRow;
      col = nextCol;
    }
  }
  return grid;
}

/* ─── Doubly-even (n % 4 === 0) construction ─────────────────────────── */

/** Constructs a normal magic square of doubly-even order (n % 4 === 0)
 *  via the Dürer-style diagonal-complement method: fill 1..n² left to
 *  right, top to bottom; mark cells on each 4×4 block's two diagonals;
 *  replace marked cell value v with (n² + 1 - v).
 */
export function doublyEvenSquare(order: number): number[][] {
  if (order < 4 || order % 4 !== 0) {
    throw new Error(
      `doublyEvenSquare needs an order divisible by 4 (got ${order})`,
    );
  }
  const n = order;
  const grid: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => r * n + c + 1),
  );
  const N = n * n + 1;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const r4 = r % 4;
      const c4 = c % 4;
      const onMainDiag = r4 === c4;
      const onAntiDiag = r4 + c4 === 3;
      if (onMainDiag || onAntiDiag) {
        grid[r]![c] = N - grid[r]![c]!;
      }
    }
  }
  return grid;
}

/* ─── Top-level constructor (per H05 §D `magicSquare(n)`) ─────────────── */

/** Public entry point. Returns one of the seven planetary fixtures
 *  when `order` matches; otherwise constructs algorithmically. Singly-
 *  even orders (n % 2 === 0 && n % 4 !== 0) — only n=6 — are served
 *  by the Sol fixture; other singly-even custom orders are rejected
 *  with a clear message (LUX method not in scope here).
 */
export function magicSquare(order: number): number[][] {
  // Prefer the traditional fixture when one exists.
  const fixture = PLANETARY_SQUARES.find((p) => p.order === order);
  if (fixture) return fixture.cells.map((row) => [...row]);
  if (order < 3) {
    throw new Error(`magicSquare needs order >= 3 (got ${order})`);
  }
  if (order % 2 === 1) return siameseSquare(order);
  if (order % 4 === 0) return doublyEvenSquare(order);
  throw new Error(
    `Singly-even custom magic squares (order ${order}) are not yet ` +
      "supported. Use a fixture or pick an odd / doubly-even order.",
  );
}
