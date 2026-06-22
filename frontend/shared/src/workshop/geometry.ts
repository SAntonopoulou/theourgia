/**
 * Shared geometry helpers for the Workshop surfaces.
 *
 * Per H05 §D + the worked example (§E): the talisman's name-ring is
 * the recurring gotcha — without `textLength = 2π·r` + `lengthAdjust
 * ="spacing"` the inscription bunches at 12 o'clock instead of
 * distributing evenly. `nameRingPath` returns the SVG `d` for an
 * inverted-Y semi-circle (so text reads left-to-right at the top of
 * the ring); callers wrap it in `<path id> + <text><textPath
 * textLength=...>`.
 *
 * `centreSymbol` renders the seven canonical circle centres
 * (pentagram, hexagram, unicursal hexagram, Solomonic seal, plus
 * three referenced kinds the surface fills via composition: a
 * practitioner-picked sigil, a square-trace, or blank).
 *
 * `printTiles` decomposes a single SVG into A4 tiles for the
 * Magical Circle's print-tile mode — with crop marks + a 10×10cm
 * calibration square on T1 so the practitioner verifies print scale
 * before committing to the full set.
 */

const TAU = Math.PI * 2;

/* ─── Name-ring text path ────────────────────────────────────────── */

export interface NameRingPathResult {
  /** SVG `d` describing a full circle the caller attaches as
   *  `<path id="..." d>`. The text element references it with
   *  `<textPath href="#..." textLength={circumference} lengthAdjust
   *  ="spacing">`. */
  d: string;
  /** 2π·r — the value the caller MUST pass as `textLength`. */
  circumference: number;
}

/** Returns the closed-circle path for an inscription ring at radius
 *  `r`. The path starts at angle `-π/2` (12 o'clock) and proceeds
 *  clockwise so text reads in the natural direction at the top of
 *  the ring. `cx`/`cy` default to 0 so the caller can centre the
 *  SVG via transform.
 *
 *  Returns the circumference alongside so the caller does not
 *  recompute (and so the test layer can verify it). */
export function nameRingPath(
  radius: number,
  cx = 0,
  cy = 0,
): NameRingPathResult {
  const r = Math.abs(radius);
  // Two arcs joined: a circle as a path. Start at top.
  const d =
    `M ${cx} ${cy - r} ` +
    `a ${r} ${r} 0 1 1 0 ${2 * r} ` +
    `a ${r} ${r} 0 1 1 0 ${-2 * r} z`;
  return { d, circumference: TAU * r };
}

/* ─── Centre symbols ─────────────────────────────────────────────── */

export type CentreSymbolKind =
  | "pentagram"
  | "hexagram"
  | "unicursal"
  | "solomonic"
  | "blank";

export interface CentreSymbol {
  /** SVG path data for the symbol. Empty string for `blank`. */
  d: string;
  /** Auxiliary path(s) — e.g. the surrounding circle of a pentagram.
   *  Caller renders these with a lighter stroke. */
  auxD?: string;
}

function pentagramPath(cx: number, cy: number, r: number): string {
  // Five points around the circle starting at 12 o'clock.
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const θ = -Math.PI / 2 + (i * TAU) / 5;
    pts.push([cx + r * Math.cos(θ), cy + r * Math.sin(θ)]);
  }
  // Connect each point to the point two steps ahead (the star).
  const order = [0, 2, 4, 1, 3, 0];
  let d = "";
  for (let i = 0; i < order.length; i++) {
    const [x, y] = pts[order[i]!]!;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trimEnd();
}

function hexagramPath(cx: number, cy: number, r: number): string {
  // Two interlocked equilateral triangles.
  const upPts: [number, number][] = [];
  const downPts: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const up = -Math.PI / 2 + (i * TAU) / 3;
    const down = Math.PI / 2 + (i * TAU) / 3;
    upPts.push([cx + r * Math.cos(up), cy + r * Math.sin(up)]);
    downPts.push([cx + r * Math.cos(down), cy + r * Math.sin(down)]);
  }
  const tri = (pts: [number, number][]) => {
    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]!;
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    d += "z";
    return d;
  };
  return `${tri(upPts)} ${tri(downPts)}`;
}

function unicursalPath(cx: number, cy: number, r: number): string {
  // Crowley's unicursal hexagram — single continuous line.
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const θ = -Math.PI / 2 + (i * TAU) / 6;
    pts.push([cx + r * Math.cos(θ), cy + r * Math.sin(θ)]);
  }
  // Standard unicursal traversal: 0 → 2 → 4 → 1 → 3 → 5 → 0
  const order = [0, 2, 4, 1, 3, 5, 0];
  let d = "";
  for (let i = 0; i < order.length; i++) {
    const [x, y] = pts[order[i]!]!;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trimEnd();
}

function solomonicPath(cx: number, cy: number, r: number): string {
  // Solomonic seal — hexagram inside a circle is the canonical
  // representation; caller draws the surrounding circle as aux.
  return hexagramPath(cx, cy, r);
}

/** Compute the SVG path strings for the given centre symbol. The
 *  `sigil` and `square-trace` kinds need caller-supplied content;
 *  the engine returns an empty `d` for them — the surface fills the
 *  centre with the practitioner's chosen sigil/square. */
export function centreSymbol(
  kind: CentreSymbolKind,
  cx = 0,
  cy = 0,
  radius = 60,
): CentreSymbol {
  switch (kind) {
    case "pentagram":
      return {
        d: pentagramPath(cx, cy, radius),
        auxD: `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} z`,
      };
    case "hexagram":
      return { d: hexagramPath(cx, cy, radius) };
    case "unicursal":
      return { d: unicursalPath(cx, cy, radius) };
    case "solomonic":
      return {
        d: solomonicPath(cx, cy, radius),
        auxD: `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} z`,
      };
    case "blank":
      return { d: "" };
  }
}

/* ─── Print tiles (Magical Circle print-tile mode) ───────────────── */

export interface PrintTile {
  /** Tile label rendered at top-left ("T1", "T2", …). */
  label: string;
  /** Tile origin in source-SVG mm (top-left corner). */
  x: number;
  y: number;
  /** Tile width/height in mm. */
  width: number;
  height: number;
}

export interface PrintTilesResult {
  /** A4 = 210mm × 297mm; tiles are emitted top-to-bottom,
   *  left-to-right. */
  tiles: PrintTile[];
  /** True if a 100mm calibration square fits inside T1 (always true
   *  for circles ≥ 100mm wide — i.e. ≥ ~10cm diameter). */
  calibrationOnT1: boolean;
}

/** Decompose a `widthMm` × `heightMm` source rectangle into A4
 *  portrait tiles (210 × 297 mm) with `bleedMm` overlap between
 *  neighbouring tiles for assembly. Returns the tile rectangles in
 *  source-mm coordinates so the caller can re-render the SVG into
 *  each tile's viewport. */
export function printTiles(
  widthMm: number,
  heightMm: number,
  bleedMm = 5,
): PrintTilesResult {
  const a4Width = 210;
  const a4Height = 297;
  const usableW = a4Width - bleedMm; // overlap zone is bleed
  const usableH = a4Height - bleedMm;
  const cols = Math.max(1, Math.ceil(widthMm / usableW));
  const rows = Math.max(1, Math.ceil(heightMm / usableH));
  const tiles: PrintTile[] = [];
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        label: `T${n}`,
        x: c * usableW,
        y: r * usableH,
        width: a4Width,
        height: a4Height,
      });
      n++;
    }
  }
  return { tiles, calibrationOnT1: widthMm >= 100 };
}
