/**
 * Waveform — deterministic SVG thumbnail for a voce recording.
 *
 * Pure presentation. Uses a tiny seeded PRNG (Mulberry-style)
 * so the same seed renders the same bar pattern across reloads.
 */

import { type CSSProperties } from "react";

export interface WaveformProps {
  seed: number;
  /** Number of bars to draw. Default 34. */
  bars?: number;
  /** Bar gap in px. Default 2. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

function seededRng(seed: number): () => number {
  let x = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

export function Waveform({
  seed,
  bars = 34,
  gap = 2,
  className,
  style,
}: WaveformProps) {
  const rng = seededRng(seed);
  const heights: number[] = [];
  for (let i = 0; i < bars; i++) {
    heights.push(20 + Math.round(rng() * 70));
  }
  return (
    <span
      data-component="voce-waveform"
      data-seed={seed}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        height: 24,
        width: "100%",
        ...style,
      }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            background: "var(--line-2)",
            borderRadius: 1,
            minWidth: 2,
          }}
        />
      ))}
    </span>
  );
}
