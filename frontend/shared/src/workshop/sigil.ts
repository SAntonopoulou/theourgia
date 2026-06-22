/**
 * Procedural sigil generators — pure functions returning SVG path
 * data (`d` strings). The Sigil Generator surface composes these
 * with chrome; the engines themselves are headless and
 * deterministic.
 *
 * Per H05 §D + §S3:
 * - `sigilCurve(family, seed, points)` — parametric curve families
 *   (rose / lissajous / harmonograph / polar). Same seed = same path.
 * - `sigilGlyph(seed, mode)` — composed letterform (Spare elimination,
 *   Hebrew letterform, Greek letterform, Rose Cross). Returns the
 *   `d` plus the ordered control points so the surface can render
 *   the construction.
 * - `sigilKamea(square, sequence)` — polyline through a magic-square
 *   path. Takes the square's cells + a sequence of cell indices and
 *   emits a polyline SVG `d` + the resolved coordinate sequence.
 * - `hashSeed(text, salt)` — SHA-256 (Web Crypto) → numeric seed.
 *   Hashed-vector mode's determinism guarantee.
 */

export type CurveFamily = "rose" | "lissajous" | "harmonograph" | "polar";

export interface SigilCurveParams {
  family: CurveFamily;
  /** Numeric seed (use `hashSeed()` for the deterministic mode). */
  seed: number;
  /** Sample count along the parameter range. 200..2000 reasonable. */
  points: number;
  /** Render size — half-edge length in viewBox units (default 100). */
  size?: number;
}

const TAU = Math.PI * 2;

/* ─── Small deterministic helpers ─────────────────────────────────── */

/** Mulberry32 — a tiny deterministic PRNG. Same seed → same stream. */
export function mulberry32(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** SHA-256 of `text + salt`, reduced to a non-negative 32-bit int.
 *  Browsers + jsdom + node 19+ all expose `crypto.subtle`. */
export async function hashSeed(text: string, salt = ""): Promise<number> {
  const data = new TextEncoder().encode(`${text}${salt}`);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (!cryptoObj?.subtle) {
    // Deterministic fallback — only used in environments without
    // SubtleCrypto (older test runners). Not cryptographically
    // strong; the surface doesn't need that here.
    let h = 5381;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) + h + data[i]!) | 0;
    }
    return Math.abs(h);
  }
  const buf = await cryptoObj.subtle.digest("SHA-256", data);
  const view = new DataView(buf);
  // Top 32 bits of the digest, masked positive.
  return view.getUint32(0, false);
}

/* ─── Curve families ───────────────────────────────────────────────── */

interface ParametricPoint {
  x: number;
  y: number;
}

function sampleCurve(
  family: CurveFamily,
  rng: () => number,
  points: number,
  size: number,
): ParametricPoint[] {
  const out: ParametricPoint[] = [];
  switch (family) {
    case "rose": {
      // r = cos(kθ)  · k ∈ {2..7}
      const k = 2 + Math.floor(rng() * 6);
      for (let i = 0; i < points; i++) {
        const θ = (i / (points - 1)) * TAU;
        const r = Math.cos(k * θ);
        out.push({ x: size * r * Math.cos(θ), y: size * r * Math.sin(θ) });
      }
      return out;
    }
    case "lissajous": {
      // x = sin(aθ + φ), y = sin(bθ)
      const a = 2 + Math.floor(rng() * 5);
      const b = 2 + Math.floor(rng() * 5);
      const φ = rng() * TAU;
      for (let i = 0; i < points; i++) {
        const θ = (i / (points - 1)) * TAU;
        out.push({ x: size * Math.sin(a * θ + φ), y: size * Math.sin(b * θ) });
      }
      return out;
    }
    case "harmonograph": {
      // Two damped pendulums per axis.
      const f1 = 1 + rng() * 4;
      const f2 = 1 + rng() * 4;
      const f3 = 1 + rng() * 4;
      const f4 = 1 + rng() * 4;
      const d1 = 0.002 + rng() * 0.01;
      const d2 = 0.002 + rng() * 0.01;
      const φ1 = rng() * TAU;
      const φ2 = rng() * TAU;
      const φ3 = rng() * TAU;
      const φ4 = rng() * TAU;
      const tMax = 40 * Math.PI;
      for (let i = 0; i < points; i++) {
        const t = (i / (points - 1)) * tMax;
        const x =
          Math.exp(-d1 * t) * Math.sin(f1 * t + φ1) +
          Math.exp(-d2 * t) * Math.sin(f2 * t + φ2);
        const y =
          Math.exp(-d1 * t) * Math.sin(f3 * t + φ3) +
          Math.exp(-d2 * t) * Math.sin(f4 * t + φ4);
        out.push({ x: (size * x) / 2, y: (size * y) / 2 });
      }
      return out;
    }
    case "polar": {
      // r = a + b·sin(kθ)
      const a = 0.3 + rng() * 0.4;
      const b = 0.3 + rng() * 0.4;
      const k = 2 + Math.floor(rng() * 7);
      for (let i = 0; i < points; i++) {
        const θ = (i / (points - 1)) * TAU;
        const r = a + b * Math.sin(k * θ);
        out.push({ x: size * r * Math.cos(θ), y: size * r * Math.sin(θ) });
      }
      return out;
    }
  }
}

function pointsToPath(pts: readonly ParametricPoint[]): string {
  if (pts.length === 0) return "";
  const first = pts[0]!;
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!;
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d;
}

export function sigilCurve(params: SigilCurveParams): string {
  const size = params.size ?? 100;
  const points = Math.max(20, Math.min(params.points, 5000));
  const rng = mulberry32(params.seed);
  const pts = sampleCurve(params.family, rng, points, size);
  return pointsToPath(pts);
}

/* ─── Spare letter-elimination sigil ─────────────────────────────── */

/** Strips vowels (English) and deduplicates remaining letters in
 *  source-text order — the classic Austin Osman Spare technique. */
export function spareLetters(intention: string): string[] {
  const lettersOnly = intention.toUpperCase().replace(/[^A-Z]/g, "");
  const noVowels = lettersOnly.replace(/[AEIOU]/g, "");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of noVowels) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out;
}

export interface SigilGlyphResult {
  /** SVG `d` for the connected polyline through letter centroids. */
  d: string;
  /** The ordered points the polyline traces. */
  points: ParametricPoint[];
  /** The reduced letter sequence (after vowel elimination + dedup). */
  letters: string[];
}

/** Composes a polyline-style sigil by:
 *  1. Reducing the intention to its Spare letter sequence.
 *  2. Distributing the remaining letters around a circle.
 *  3. Drawing the polyline through their centres in order.
 *
 *  The result is a deterministic abstract glyph the surface can
 *  render alone or overlay with the letterform glyphs themselves
 *  for the construction-step view.
 */
export function sigilGlyph(
  intention: string,
  size = 100,
): SigilGlyphResult {
  const letters = spareLetters(intention);
  if (letters.length === 0) {
    return { d: "", points: [], letters };
  }
  const radius = size * 0.7;
  const points: ParametricPoint[] = letters.map((_, i) => {
    const θ = -Math.PI / 2 + (i / letters.length) * TAU;
    return { x: radius * Math.cos(θ), y: radius * Math.sin(θ) };
  });
  return { d: pointsToPath(points), points, letters };
}

/* ─── Kamea path-trace sigil ─────────────────────────────────────── */

export interface SigilKameaResult {
  /** Cell-centre polyline `d`. */
  d: string;
  /** Sequence of (row, col) indices traversed. */
  sequence: readonly [number, number][];
}

/** Trace a polyline through a magic square at the given cell-value
 *  sequence. `cells` is the n×n square; `valueSequence` is the
 *  numeric sequence the practitioner picks (often the gematria
 *  digits of their intention). The polyline connects the cells
 *  containing each value in turn, in cell-centre coordinates of a
 *  unit square (-size/2 .. +size/2). */
export function sigilKamea(
  cells: readonly (readonly number[])[],
  valueSequence: readonly number[],
  size = 100,
): SigilKameaResult {
  const n = cells.length;
  // Build value → (row, col) lookup.
  const lookup = new Map<number, [number, number]>();
  for (let r = 0; r < n; r++) {
    const row = cells[r]!;
    for (let c = 0; c < row.length; c++) {
      const v = row[c]!;
      if (!lookup.has(v)) lookup.set(v, [r, c]);
    }
  }
  const sequence: [number, number][] = [];
  const pts: ParametricPoint[] = [];
  const step = size / n;
  const origin = -size / 2 + step / 2;
  for (const v of valueSequence) {
    const idx = lookup.get(v);
    if (!idx) continue; // value not present in this square — skip
    sequence.push(idx);
    const [r, c] = idx;
    pts.push({ x: origin + c * step, y: origin + r * step });
  }
  return { d: pointsToPath(pts), sequence };
}
