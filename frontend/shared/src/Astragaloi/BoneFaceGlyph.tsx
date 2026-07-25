/**
 * BoneFaceGlyph — pip cluster for a single knucklebone face.
 *
 * Rule 68: only 1, 3, 4 and 6 exist. There is no layout for 2 or 5 —
 * an illegal value renders nothing rather than improvising a d6 face.
 * Engraving style: solid pips in currentColor, no fills behind.
 */

import { isBoneFace } from "./faces.js";

/** Pip positions per face, as fractions of the glyph box. */
const PIP_LAYOUTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0.5, 0.5]],
  3: [
    [0.28, 0.28],
    [0.5, 0.5],
    [0.72, 0.72],
  ],
  4: [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.3, 0.7],
    [0.7, 0.7],
  ],
  6: [
    [0.3, 0.26],
    [0.7, 0.26],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.74],
    [0.7, 0.74],
  ],
};

export interface BoneFaceGlyphProps {
  /** 1 | 3 | 4 | 6 — anything else renders nothing (rule 68). */
  face: number;
  /** Box size in px. Default 24. */
  size?: number;
}

export function BoneFaceGlyph({ face, size = 24 }: BoneFaceGlyphProps) {
  if (!isBoneFace(face)) return null;
  const pips = PIP_LAYOUTS[face] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      data-bone-face={face}
    >
      {pips.map(([px, py], i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: static layout
          key={i}
          cx={px * size}
          cy={py * size}
          r={size * 0.075}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
