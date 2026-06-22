/**
 * PendulumDial — SVG dial showing the pendulum's swing angle.
 *
 * Verbatim from `pendulumEl()` in `Theourgia Divination Misc.dc.html`
 * (lines 282-292). Yes → 22°, No → -22°, Maybe → 6°, Unclear → 0°.
 */

import { type CSSProperties } from "react";

import type { PendulumAnswer } from "../divination/index.js";

const ANGLE_FOR: Record<PendulumAnswer, number> = {
  Yes: 22,
  No: -22,
  Maybe: 6,
  Unclear: 0,
};

export interface PendulumDialProps {
  answer: PendulumAnswer;
  className?: string;
  style?: CSSProperties;
}

export function PendulumDial({
  answer,
  className,
  style,
}: PendulumDialProps) {
  const angle = ANGLE_FOR[answer];
  return (
    <svg
      width={120}
      height={150}
      viewBox="0 0 120 150"
      role="img"
      aria-label={`Pendulum answering ${answer}`}
      data-component="pendulum-dial"
      data-answer={answer}
      className={className}
      style={style}
    >
      <circle cx="60" cy="10" r="3" fill="var(--ink-mute)" />
      <g transform={`rotate(${angle} 60 10)`}>
        <line
          x1="60"
          y1="10"
          x2="60"
          y2="118"
          stroke="var(--line-2)"
          strokeWidth={1.5}
        />
        <circle cx="60" cy="126" r="11" fill="var(--accent)" />
      </g>
      <path
        d="M30 138h60"
        stroke="var(--line)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
    </svg>
  );
}
