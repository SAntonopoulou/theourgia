/**
 * TalismanCanvas — the H05 §E worked example.
 *
 * 600×600 composite SVG: dashed concentric guides (25/50/75/100%) ·
 * optional grid overlay · outer accent rings · name-ring via
 * `<textPath textLength={2π·r} lengthAdjust="spacing">` (B90
 * nameRingPath — the recurring gotcha) · Jupiter kamea embed (B92
 * PLANETARY_SQUARES) with the traced Intelligence-of-Jupiter sigil
 * on the front face · planetary character + intelligence ring on the
 * back face.
 *
 * Per §E: this is a **composition of references**, not pixels. The
 * embedded square + traced sigil derive from the layer model and
 * re-render every frame; nothing is stored as a bitmap.
 */

import * as React from "react";
import { type CSSProperties } from "react";

import { nameRingPath, planetarySquare } from "../workshop/index.js";

import { type TalismanFace } from "./copy.js";

const VIEWBOX = 600;
const CENTRE = 300;

/** Jupiter-Intelligence (Yophiel) trace sequence over the 4×4 kamea.
 *  Verbatim from the mockup line 260: 1 → 4 → 8 → 11 → 15 → 2 → 13. */
const YOPHIEL_SEQUENCE: readonly number[] = [1, 4, 8, 11, 15, 2, 13];

/** Front-face name-ring placeholder. The actual inscription text is
 *  authored per layer in the LayerConfig panels — this string only
 *  seeds the ring geometry until real per-layer text is threaded
 *  through. No cultural specimen leaks into every deploy. */
const FRONT_RING_TEXT = "· · · front-face inscription · · ·";
/** Back-face name-ring placeholder. */
const BACK_RING_TEXT = "· · · back-face inscription · · ·";
/** Back inner ring placeholder. */
const BACK_INNER_RING_TEXT = "· · · inner ring · · ·";

export interface TalismanCanvasProps {
  face: TalismanFace;
  snapGrid?: boolean;
  className?: string;
  style?: CSSProperties;
}

function Guides() {
  return (
    <g data-canvas-guides opacity={0.5} aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle
          key={i}
          cx={CENTRE}
          cy={CENTRE}
          r={285 * f}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="2 6"
        />
      ))}
    </g>
  );
}

function Grid() {
  const lines: React.ReactElement[] = [];
  for (let i = 0; i <= 12; i++) {
    lines.push(
      <line
        key={`gx-${i}`}
        x1={i * 50}
        y1={0}
        x2={i * 50}
        y2={600}
        stroke="var(--line)"
        strokeWidth={0.6}
      />,
    );
    lines.push(
      <line
        key={`gy-${i}`}
        x1={0}
        y1={i * 50}
        x2={600}
        y2={i * 50}
        stroke="var(--line)"
        strokeWidth={0.6}
      />,
    );
  }
  return (
    <g data-canvas-grid opacity={0.18} aria-hidden="true">
      {lines}
    </g>
  );
}

function OuterRings() {
  return (
    <g aria-hidden="true">
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={288}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={270}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1}
        opacity={0.6}
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={208}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1}
        opacity={0.45}
      />
    </g>
  );
}

/** Renders a name ring at the given radius using
 *  `<textPath textLength=2π·r lengthAdjust="spacing">` so the text
 *  distributes evenly across the full circumference (per H05 §E). */
function NameRing({
  id,
  text,
  radius,
  fontSize,
  fill,
}: {
  id: string;
  text: string;
  radius: number;
  fontSize: number;
  fill: string;
}) {
  const { d, circumference } = nameRingPath(radius, CENTRE, CENTRE);
  return (
    <g data-name-ring={id}>
      <path id={id} d={d} fill="none" />
      <text
        fill={fill}
        fontFamily="var(--font-hebrew)"
        fontSize={fontSize}
      >
        <textPath
          href={`#${id}`}
          startOffset={0}
          textLength={Math.round(circumference)}
          lengthAdjust="spacing"
        >
          {text}
        </textPath>
      </text>
    </g>
  );
}

function JupiterKameaWithSigil() {
  const square = planetarySquare("jupiter");
  const cellSize = 58;
  const gx = CENTRE - 2 * cellSize;
  const gy = CENTRE - 2 * cellSize;

  const centreOf = (v: number): [number, number] | null => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (square.cells[r]![c] === v) {
          return [gx + c * cellSize + cellSize / 2, gy + r * cellSize + cellSize / 2];
        }
      }
    }
    return null;
  };

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      cells.push(
        <rect
          key={`r-${r}-${c}`}
          x={gx + c * cellSize}
          y={gy + r * cellSize}
          width={cellSize}
          height={cellSize}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={0.8}
          opacity={0.4}
        />,
      );
      cells.push(
        <text
          key={`t-${r}-${c}`}
          x={gx + c * cellSize + cellSize / 2}
          y={gy + r * cellSize + cellSize / 2 + 6}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={17}
          fill="var(--ink)"
          opacity={0.65}
        >
          {square.cells[r]![c]}
        </text>,
      );
    }
  }

  let d = "";
  for (let i = 0; i < YOPHIEL_SEQUENCE.length; i++) {
    const p = centreOf(YOPHIEL_SEQUENCE[i]!);
    if (!p) continue;
    d += `${i === 0 ? "M" : "L"}${p[0]} ${p[1]} `;
  }
  const start = centreOf(YOPHIEL_SEQUENCE[0]!);
  const end = centreOf(YOPHIEL_SEQUENCE[YOPHIEL_SEQUENCE.length - 1]!);

  return (
    <g data-front-kamea>
      {cells}
      <path
        d={d.trimEnd()}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {start ? (
        <circle
          cx={start[0]}
          cy={start[1]}
          r={6}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.6}
        />
      ) : null}
      {end ? (
        <circle cx={end[0]} cy={end[1]} r={4} fill="var(--accent)" />
      ) : null}
    </g>
  );
}

function BackPlanetaryCharacter() {
  return (
    <g data-back-body>
      {/* Stylised planetary character of Jupiter (verbatim path
       *  from mockup line 265). */}
      <path
        d="M260 360 L260 250 Q260 220 300 220 Q345 220 345 262 L345 330 M230 290 L290 290"
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <NameRing
        id="tl-back-inner-ring"
        text={BACK_INNER_RING_TEXT}
        radius={238}
        fontSize={22}
        fill="var(--ink-soft)"
      />
    </g>
  );
}

export const TalismanCanvas = React.forwardRef<
  SVGSVGElement,
  TalismanCanvasProps
>(function TalismanCanvas(
  { face, snapGrid = true, className, style },
  ref,
) {
  return (
    <svg
      ref={ref}
      data-component="talisman-canvas"
      data-face={face}
      data-snap-grid={snapGrid}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      role="img"
      aria-label={`Talisman ${face}`}
      className={className}
      style={{
        maxWidth: "min(560px, 72vh)",
        aspectRatio: "1",
        ...style,
      }}
    >
      <rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} fill="var(--bg-sunk)" rx={8} />
      {snapGrid ? <Grid /> : null}
      <Guides />
      <OuterRings />
      <NameRing
        id={`tl-name-ring-${face}`}
        text={face === "front" ? FRONT_RING_TEXT : BACK_RING_TEXT}
        radius={277}
        fontSize={20}
        fill="var(--accent)"
      />
      {face === "front" ? <JupiterKameaWithSigil /> : <BackPlanetaryCharacter />}
    </svg>
  );
});
