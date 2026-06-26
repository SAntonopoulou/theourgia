/**
 * SigilPreview — the centre-of-gravity SVG. Renders the active mode's
 * procedural output inside a 280×280 viewBox + ring decoration.
 *
 * Composes the workshop engines (B90): `sigilCurve`, `sigilGlyph`,
 * `sigilKamea`, `mulberry32`. The operations (rotate / scale /
 * mirror / recolor) ride as a transform on the inner `<g>` so they
 * do not mutate the source parameters (per H05 §S2.1: the make is
 * committed, not silently mutated).
 */

import * as React from "react";
import { type CSSProperties, useMemo } from "react";

import {
  PLANETARY_SQUARES,
  type CurveFamily,
  type PlanetKey,
  mulberry32,
  sigilCurve,
  sigilGlyph,
  sigilKamea,
} from "../workshop/index.js";

import type { SigilMode } from "./copy.js";

/** Operations a caller can layer over the source SVG without
 *  changing the source parameters. Per the H05 supplement — these
 *  are read at render and never persisted to the sigil row. */
export interface SigilOperations {
  color?: string;
  rotateDeg?: number;
  /** Scale in 100..800 — divided by 320 to get a viewBox multiplier. */
  scalePercent?: number;
  mirror?: boolean;
}

export interface SigilPreviewProps {
  mode: SigilMode;
  /** Intention text — feeds the deterministic seed. */
  intention: string;
  /**
   * Active planetary square (kamea mode). Ignored when
   * ``customSquareCells`` is supplied — that path bypasses the
   * 7-fixture planetary lookup entirely.
   */
  square?: PlanetKey;
  /** Active curve family (hashed mode). */
  family?: CurveFamily;
  /**
   * Optional kamea trace override. When supplied, the kamea mode
   * uses this exact cell-value sequence instead of deriving one
   * from the intention. Used by the B92 → B91 "Save as sigil"
   * cross-surface handoff: a user's trace in the Magic Squares
   * surface is carried over as the sigil's path.
   */
  cellSequenceOverride?: readonly number[];
  /**
   * Optional custom-square cells. When supplied AND ``mode ===
   * "kamea"``, the cells are traced directly — the planetary
   * lookup is bypassed entirely. Extends the B92 → B91 handoff
   * to the H07 Custom Square Builder: any practitioner-authored
   * n×n square (manuscript reconstruction, personal construction)
   * becomes a sigil substrate without needing to be one of the
   * 7 Agrippa planetary fixtures.
   *
   * Shape: ``number[][]`` (n rows, n cols of integer cell values).
   * Empty or shape-invalid arrays fall back to the planet lookup.
   */
  customSquareCells?: readonly (readonly number[])[];
  operations?: SigilOperations;
  className?: string;
  style?: CSSProperties;
}

const VIEWBOX = 280;
const CENTRE = 140;

/** Tiny deterministic hash matching the mockup's `hash()` so the
 *  same intention + mode + square produce the same seed across
 *  renders and across the library thumbnail vs. main preview. */
function hashIntention(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function ringDecoration(color: string) {
  return (
    <g opacity={0.22} aria-hidden="true">
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={128}
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={118}
        fill="none"
        stroke={color}
        strokeWidth={0.6}
      />
    </g>
  );
}

function kameaPlanet(mode: SigilMode, square: PlanetKey): PlanetKey {
  return mode === "kamea" ? square : "saturn";
}

function pickSquareCells(planet: PlanetKey) {
  const found = PLANETARY_SQUARES.find((p) => p.planet === planet);
  return found?.cells ?? PLANETARY_SQUARES[0]!.cells;
}

/**
 * Validate a custom square: must be a non-empty array of equal-
 * length rows. Returns the cells unchanged when valid; ``null``
 * otherwise (so the caller falls back to the planet lookup).
 */
function validCustomCells(
  cells: readonly (readonly number[])[] | undefined,
): readonly (readonly number[])[] | null {
  if (!cells || cells.length === 0) return null;
  const n = cells.length;
  for (const row of cells) {
    if (!row || row.length !== n) return null;
  }
  return cells;
}

function familyForMode(mode: SigilMode, family: CurveFamily): CurveFamily {
  if (mode === "harmonograph") return "harmonograph";
  if (mode === "rosette") return "rose";
  if (mode === "formula") return "polar";
  return family;
}

/** Render the active mode into a centred SVG inner-group. */
function ModeBody({
  mode,
  intention,
  square,
  family,
  color,
  cellSequenceOverride,
  customSquareCells,
}: {
  mode: SigilMode;
  intention: string;
  square: PlanetKey;
  family: CurveFamily;
  color: string;
  cellSequenceOverride?: readonly number[];
  customSquareCells?: readonly (readonly number[])[];
}) {
  const validCustom = validCustomCells(customSquareCells);
  const seed = useMemo(
    () => hashIntention(
      `${intention}${mode}${validCustom ? "custom" : square}`,
    ),
    [intention, mode, square, validCustom],
  );

  if (mode === "kamea") {
    // Custom cells take precedence over the planet lookup. The
    // H07 Custom Square Builder hands its output straight in via
    // this prop — no need to register the custom square as a
    // planet.
    const cells = validCustom ?? pickSquareCells(square);
    const n = cells.length;
    let sequence: number[];
    if (cellSequenceOverride && cellSequenceOverride.length > 0) {
      // Cross-surface handoff: the caller (e.g. B92 Magic Squares
      // trace) supplied the exact cell-value path. Use it verbatim.
      sequence = [...cellSequenceOverride];
    } else {
      const rng = mulberry32(seed);
      // Sample a few cell values pseudo-randomly to trace.
      sequence = [];
      const taken = new Set<number>();
      for (let k = 0; k < Math.min(8, n * n); k++) {
        let v = Math.floor(rng() * n * n) + 1;
        let attempts = 0;
        while (taken.has(v) && attempts < n * n) {
          v = (v % (n * n)) + 1;
          attempts++;
        }
        taken.add(v);
        sequence.push(v);
      }
    }
    const cellSize = 200 / n;
    const off = 40;
    const traced = sigilKamea(cells, sequence, 200);
    // The engine returns coords centred at 0 — shift into the
    // viewBox by offsetting cell origin to (off, off).
    // Build the grid lines directly.
    const gridLines: React.ReactElement[] = [];
    for (let i = 1; i < n; i++) {
      const p = off + i * cellSize;
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={p}
          y1={off}
          x2={p}
          y2={off + 200}
          stroke="var(--line-2)"
          strokeWidth={1}
        />,
      );
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={off}
          y1={p}
          x2={off + 200}
          y2={p}
          stroke="var(--line-2)"
          strokeWidth={1}
        />,
      );
    }
    // Translate the engine's centred path into viewBox coords.
    // engine path uses (-100..100) coords; we need (off..off+200).
    const d = traced.d.replace(
      /(-?\d+\.\d+)/g,
      (raw, _idx) => (Number(raw) + 100 + off).toFixed(2),
    );
    // Re-extract start/end points for the bookend rings.
    const first = traced.sequence[0];
    const last = traced.sequence[traced.sequence.length - 1];
    return (
      <g>
        <g opacity={0.5}>{gridLines}</g>
        <rect
          x={off}
          y={off}
          width={200}
          height={200}
          fill="none"
          stroke="var(--line-2)"
          strokeWidth={1}
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {first ? (
          <circle
            cx={off + first[1] * cellSize + cellSize / 2}
            cy={off + first[0] * cellSize + cellSize / 2}
            r={6}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
        ) : null}
        {last ? (
          <circle
            cx={off + last[1] * cellSize + cellSize / 2}
            cy={off + last[0] * cellSize + cellSize / 2}
            r={3.5}
            fill={color}
          />
        ) : null}
      </g>
    );
  }

  if (mode === "image") {
    return (
      <g>
        <rect
          x={64}
          y={64}
          width={152}
          height={152}
          rx={8}
          fill="var(--bg-3)"
          stroke="var(--line)"
          opacity={0.5}
        />
        <text
          x={CENTRE}
          y={120}
          textAnchor="middle"
          fontSize={10}
          fill="var(--ink-mute)"
          fontFamily="var(--font-ui)"
        >
          uploaded image · 50%
        </text>
        <path
          d={sigilCurve({ family: "polar", seed, points: 300, size: 104 })}
          transform={`translate(${CENTRE} ${CENTRE})`}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          opacity={0.95}
        />
      </g>
    );
  }

  // Glyph-based modes (spare / hebrew / greek / rose / freeform).
  const isGlyphMode =
    mode === "spare" ||
    mode === "hebrew" ||
    mode === "greek" ||
    mode === "rose" ||
    mode === "freeform";

  if (isGlyphMode) {
    const g = sigilGlyph(intention, 104);
    const first = g.points[0];
    const last = g.points[g.points.length - 1];
    return (
      <g>
        {mode === "freeform" ? null : ringDecoration(color)}
        <g transform={`translate(${CENTRE} ${CENTRE})`}>
          <path
            d={g.d}
            fill="none"
            stroke={color}
            strokeWidth={mode === "freeform" ? 3.6 : 3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {first && mode !== "freeform" ? (
            <circle
              cx={first.x}
              cy={first.y}
              r={5}
              fill="none"
              stroke={color}
              strokeWidth={2.6}
            />
          ) : null}
          {last && mode !== "freeform" ? (
            <circle cx={last.x} cy={last.y} r={3.4} fill={color} />
          ) : null}
        </g>
      </g>
    );
  }

  // Curve-family modes (hashed / harmonograph / formula / rosette).
  const fam = familyForMode(mode, family);
  const d = sigilCurve({ family: fam, seed, points: 520, size: 104 });
  return (
    <g>
      {ringDecoration(color)}
      <path
        d={d}
        transform={`translate(${CENTRE} ${CENTRE})`}
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export const SigilPreview = React.forwardRef<
  SVGSVGElement,
  SigilPreviewProps
>(function SigilPreview(
  {
    mode,
    intention,
    square = "saturn",
    family = "rose",
    cellSequenceOverride,
    customSquareCells,
    operations,
    className,
    style,
  },
  svgRef,
) {
  const color = operations?.color ?? "var(--accent)";
  const scale = (operations?.scalePercent ?? 320) / 320;
  const rotate = operations?.rotateDeg ?? 0;
  const sx = operations?.mirror ? -scale : scale;
  const transform = `translate(${CENTRE} ${CENTRE}) scale(${sx} ${scale}) rotate(${rotate}) translate(${-CENTRE} ${-CENTRE})`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      role="img"
      aria-label="Sigil preview"
      data-component="sigil-preview"
      data-mode={mode}
      className={className}
      style={{ maxWidth: 440, aspectRatio: "1", ...style }}
    >
      <g transform={transform}>
        <ModeBody
          mode={mode}
          intention={intention}
          square={kameaPlanet(mode, square)}
          family={family}
          color={color}
          cellSequenceOverride={cellSequenceOverride}
          customSquareCells={customSquareCells}
        />
      </g>
    </svg>
  );
});
