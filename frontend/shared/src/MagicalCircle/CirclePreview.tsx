/**
 * CirclePreview — the live 600×600 SVG.
 *
 * Composes B90 `centreSymbol` for the pentagram / hexagram /
 * unicursal / solomonic kinds; sigil/square placeholders render
 * inline (full sigil + square embeds wire when the layer model
 * shares state with the talisman canvas).
 *
 * Watchtowers compass colours cardinals with --earth (N), --air
 * (E), --fire (S), --water (W). Other traditions use --ink.
 *
 * Print-tile mode overlays A4 crop marks + a 10cm calibration
 * square on tile T1. The geometry of true A4 tiling lives in B90
 * `printTiles`; this overlay is the practitioner's visual
 * confirmation that print scale is correct.
 */

import * as React from "react";
import { type CSSProperties } from "react";

import { centreSymbol, nameRingPath } from "../workshop/index.js";

import {
  COMPASS_DEFINITIONS,
  type CentreElement,
  type CompassTradition,
  type RingKind,
} from "./copy.js";

export interface RingState {
  kind: RingKind;
}

export interface CirclePreviewProps {
  rings: readonly RingState[];
  compass: CompassTradition;
  centre: CentreElement;
  printTile?: boolean;
  className?: string;
  style?: CSSProperties;
}

const VIEWBOX = 600;
const CENTRE = 300;
const R_MAX = 278;

/** Cardinal colour for Watchtowers — `--earth/--air/--fire/--water`. */
const WATCHTOWER_COLOURS: readonly [string, string, string, string] = [
  "var(--earth)",
  "var(--air)",
  "var(--fire)",
  "var(--water)",
];

const DEMO_GLYPHS: readonly string[] = [
  "☉",
  "☽",
  "☿",
  "♀",
  "♂",
  "♃",
  "♄",
  "☊",
  "☋",
  "✦",
  "☉",
  "♃",
];

function NameRing({
  id,
  text,
  radius,
  fontSize,
}: {
  id: string;
  text: string;
  radius: number;
  fontSize: number;
}) {
  const { d, circumference } = nameRingPath(radius, CENTRE, CENTRE);
  return (
    <g>
      <path id={id} d={d} fill="none" />
      <text
        fill="var(--accent)"
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

function GlyphRing({
  radius,
  offset,
  ringIndex,
}: {
  radius: number;
  offset: number;
  ringIndex: number;
}) {
  const count = 12;
  const els: React.ReactElement[] = [];
  for (let g = 0; g < count; g++) {
    const a = ((-90 + (g * 360) / count) * Math.PI) / 180;
    const x = CENTRE + (radius - 13) * Math.cos(a);
    const y = CENTRE + (radius - 13) * Math.sin(a);
    els.push(
      <text
        key={g}
        x={x}
        y={y + 5}
        textAnchor="middle"
        fontFamily="var(--font-glyph)"
        fontSize={15}
        fill="var(--ink-soft)"
      >
        {DEMO_GLYPHS[(g + ringIndex) % DEMO_GLYPHS.length]}
      </text>,
    );
  }
  return (
    <g data-ring-kind="glyphs" data-ring-index={ringIndex}>
      {els}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={radius - 26 + offset}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1}
        opacity={0.45}
      />
    </g>
  );
}

function renderCentre(kind: CentreElement) {
  if (kind === "blank") return null;
  // The 4 B90-supported centre symbols.
  if (
    kind === "pentagram" ||
    kind === "hexagram" ||
    kind === "unicursal" ||
    kind === "solomonic"
  ) {
    const sym = centreSymbol(kind, CENTRE, CENTRE, 52);
    return (
      <g data-centre={kind}>
        {sym.auxD ? (
          <path
            d={sym.auxD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.6}
            opacity={0.5}
          />
        ) : null}
        <path
          d={sym.d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </g>
    );
  }
  // Sigil + Square placeholders — the surface eventually pipes in a
  // chosen B91 sigil id or B92 square id.
  if (kind === "sigil") {
    const r = 52;
    return (
      <path
        data-centre="sigil"
        d={
          `M${CENTRE - r * 0.7} ${CENTRE + r * 0.4} ` +
          `Q${CENTRE} ${CENTRE - r} ${CENTRE + r * 0.7} ${CENTRE + r * 0.4} ` +
          `M${CENTRE - r * 0.4} ${CENTRE} L${CENTRE + r * 0.4} ${CENTRE}`
        }
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    );
  }
  if (kind === "square") {
    const r = 52;
    return (
      <g data-centre="square">
        <rect
          x={CENTRE - r * 0.7}
          y={CENTRE - r * 0.7}
          width={r * 1.4}
          height={r * 1.4}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.5}
        />
        <path
          d={
            `M${CENTRE - r * 0.5} ${CENTRE - r * 0.5} ` +
            `L${CENTRE + r * 0.5} ${CENTRE + r * 0.2} ` +
            `L${CENTRE - r * 0.2} ${CENTRE + r * 0.5}`
          }
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  return null;
}

function renderCompass(compass: CompassTradition) {
  const def = COMPASS_DEFINITIONS[compass];
  const [n, e, s, w] = def.cardinals;
  const watchtower = compass === "watchtowers";
  const colour = (idx: number) =>
    watchtower ? WATCHTOWER_COLOURS[idx] : "var(--ink)";
  return (
    <g data-compass={compass}>
      <text
        x={CENTRE}
        y={CENTRE - R_MAX + 34}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={18}
        fill={colour(0)}
      >
        {n}
      </text>
      <text
        x={CENTRE + R_MAX - 30}
        y={CENTRE + 5}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={18}
        fill={colour(1)}
      >
        {e}
      </text>
      <text
        x={CENTRE}
        y={CENTRE + R_MAX - 22}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={18}
        fill={colour(2)}
      >
        {s}
      </text>
      <text
        x={CENTRE - R_MAX + 30}
        y={CENTRE + 5}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={18}
        fill={colour(3)}
      >
        {w}
      </text>
      {(["N", "E", "S", "W"] as const).map((letter, i) => {
        const positions: [number, number][] = [
          [CENTRE, CENTRE - R_MAX + 16],
          [CENTRE + R_MAX - 12, CENTRE - 8],
          [CENTRE, CENTRE + R_MAX - 4],
          [CENTRE - R_MAX + 12, CENTRE - 8],
        ];
        const [x, y] = positions[i]!;
        return (
          <text
            key={letter}
            x={x}
            y={y}
            textAnchor="middle"
            fontFamily="var(--font-ui)"
            fontSize={10}
            fill="var(--ink-mute)"
            letterSpacing={i === 0 ? "0.1em" : undefined}
          >
            {letter}
          </text>
        );
      })}
    </g>
  );
}

function renderPrintTile() {
  const labelPositions: [string, number, number][] = [
    ["T1", 40, 28],
    ["T2", 560, 28],
    ["T3", 40, 580],
    ["T4", 560, 580],
  ];
  return (
    <g data-print-tile>
      <rect
        x={8}
        y={8}
        width={584}
        height={584}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="4 6"
      />
      <line
        x1={300}
        y1={8}
        x2={300}
        y2={592}
        stroke="var(--line)"
        strokeWidth={0.6}
        strokeDasharray="3 7"
      />
      <line
        x1={8}
        y1={300}
        x2={592}
        y2={300}
        stroke="var(--line)"
        strokeWidth={0.6}
        strokeDasharray="3 7"
      />
      <rect
        x={20}
        y={540}
        width={40}
        height={40}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.2}
      />
      <text
        x={40}
        y={534}
        textAnchor="middle"
        fontFamily="var(--font-ui)"
        fontSize={9}
        fill="var(--ink-mute)"
      >
        10cm
      </text>
      {labelPositions.map(([label, x, y]) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fill="var(--ink-mute)"
        >
          {label}
        </text>
      ))}
    </g>
  );
}

export function CirclePreview({
  rings,
  compass,
  centre,
  printTile = false,
  className,
  style,
}: CirclePreviewProps) {
  const n = rings.length;
  const gap = (R_MAX - 60) / Math.max(n, 1);
  const ringElements: React.ReactElement[] = [];
  rings.forEach((ring, i) => {
    const rr = R_MAX - 6 - i * gap;
    if (ring.kind === "inscription") {
      ringElements.push(
        <React.Fragment key={`ring-${i}`}>
          <NameRing
            id={`mc-ins-${i}`}
            text="אל אב גבור עולם · אדני · אל אב גבור עולם · אדני"
            radius={rr - 12}
            fontSize={19}
          />
          <circle
            data-ring-kind="inscription"
            data-ring-index={i}
            cx={CENTRE}
            cy={CENTRE}
            r={rr - 26}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1}
            opacity={0.5}
          />
        </React.Fragment>,
      );
    } else if (ring.kind === "glyphs") {
      ringElements.push(
        <GlyphRing key={`ring-${i}`} radius={rr} offset={0} ringIndex={i} />,
      );
    } else if (ring.kind === "image") {
      ringElements.push(
        <circle
          key={`ring-${i}`}
          data-ring-kind="image"
          data-ring-index={i}
          cx={CENTRE}
          cy={CENTRE}
          r={rr - 10}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.55}
          strokeDasharray="4 4"
        />,
      );
    } else if (ring.kind === "multi") {
      ringElements.push(
        <circle
          key={`ring-${i}`}
          data-ring-kind="multi"
          data-ring-index={i}
          cx={CENTRE}
          cy={CENTRE}
          r={rr - 10}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.5}
        />,
      );
    } else {
      // blank
      ringElements.push(
        <circle
          key={`ring-${i}`}
          data-ring-kind="blank"
          data-ring-index={i}
          cx={CENTRE}
          cy={CENTRE}
          r={rr}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.4}
        />,
      );
    }
  });

  return (
    <svg
      data-component="magical-circle-preview"
      data-compass={compass}
      data-centre={centre}
      data-ring-count={n}
      data-print-tile={printTile}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      role="img"
      aria-label="Magical circle preview"
      className={className}
      style={{
        maxWidth: "min(560px, 76vh)",
        aspectRatio: "1",
        ...style,
      }}
    >
      <rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} fill="var(--bg-sunk)" rx={8} />
      {printTile ? renderPrintTile() : null}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={R_MAX}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.4}
      />
      <g opacity={0.3} aria-hidden="true">
        <line
          x1={CENTRE}
          y1={CENTRE - R_MAX}
          x2={CENTRE}
          y2={CENTRE + R_MAX}
          stroke="var(--accent)"
          strokeWidth={1}
        />
        <line
          x1={CENTRE - R_MAX}
          y1={CENTRE}
          x2={CENTRE + R_MAX}
          y2={CENTRE}
          stroke="var(--accent)"
          strokeWidth={1}
        />
      </g>
      {ringElements}
      {renderCompass(compass)}
      {renderCentre(centre)}
    </svg>
  );
}
