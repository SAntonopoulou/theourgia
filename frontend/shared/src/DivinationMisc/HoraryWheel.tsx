/**
 * HoraryWheel — 12-house whole-sign wheel SVG.
 *
 * Verbatim from `horaryWheelEl()` in `Theourgia Divination Misc.dc.html`
 * (lines 293-306). Outer + inner ring with 12 spokes; house numerals
 * I..XII run around the inner ring; planets placed at house midpoints.
 * The single permitted inline literal is `var(--pl-sun, #D8A14A)` —
 * resolves to the H01 planetary token when present.
 */

import { type CSSProperties } from "react";

const PLANETS: ReadonlyArray<{
  glyph: string;
  house: number;
  color: string;
}> = [
  { glyph: "☉", house: 2, color: "var(--pl-sun, #D8A14A)" },
  { glyph: "☽", house: 9, color: "#9FB0C8" },
  { glyph: "☿", house: 2, color: "#9C8459" },
  { glyph: "♀", house: 3, color: "#C58FA8" },
  { glyph: "♂", house: 6, color: "#B86A55" },
  { glyph: "♃", house: 6, color: "#C8A86A" },
  { glyph: "♄", house: 8, color: "#8A93A6" },
];

export interface HoraryWheelProps {
  className?: string;
  style?: CSSProperties;
}

export function HoraryWheel({ className, style }: HoraryWheelProps) {
  const cx = 130;
  const cy = 130;
  const rO = 120;
  const rI = 78;

  // 12 spokes
  const spokes = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    spokes.push(
      <line
        key={`s${i}`}
        x1={cx + rI * Math.cos(a)}
        y1={cy + rI * Math.sin(a)}
        x2={cx + rO * Math.cos(a)}
        y2={cy + rO * Math.sin(a)}
        stroke="var(--line)"
        strokeWidth={1}
      />,
    );
  }

  // House numerals
  const houseNums = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 + 15 + 180) * Math.PI) / 180;
    houseNums.push(
      <text
        key={`h${i}`}
        x={cx + (rI + 19) * Math.cos(a)}
        y={cy + (rI + 19) * Math.sin(a) + 3}
        fontSize={9}
        fill="var(--ink-mute)"
        textAnchor="middle"
        fontFamily="var(--font-ui)"
      >
        {i + 1}
      </text>,
    );
  }

  // Planet placements
  const pEls = PLANETS.map((p, i) => {
    const a = ((p.house * 30 + 15 + 180) * Math.PI) / 180;
    const offset = i % 2 ? 12 : -2;
    const r = rI + (rO - rI) / 2 - offset;
    return (
      <text
        key={`p${i}`}
        x={cx + r * Math.cos(a)}
        y={cy + r * Math.sin(a) + 5}
        fontSize={15}
        fill={p.color}
        textAnchor="middle"
        fontFamily="var(--font-glyph)"
      >
        {p.glyph}
      </text>
    );
  });

  return (
    <svg
      width={260}
      height={260}
      viewBox="0 0 260 260"
      role="img"
      aria-label="Horary chart (Hellenistic, whole-sign houses)"
      data-component="horary-wheel"
      className={className}
      style={style}
    >
      <circle
        cx={cx}
        cy={cy}
        r={rO}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth={1.5}
      />
      <circle
        cx={cx}
        cy={cy}
        r={rI}
        fill="none"
        stroke="var(--line)"
        strokeWidth={1}
      />
      {spokes}
      {houseNums}
      {pEls}
      <text
        x={cx - rO - 2}
        y={cy + 3}
        fontSize={11}
        fill="var(--accent)"
        textAnchor="end"
        fontFamily="var(--font-glyph)"
      >
        Asc
      </text>
    </svg>
  );
}
