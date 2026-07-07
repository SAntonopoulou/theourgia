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
  /** ``null`` renders the dial at rest in --ink-mute — the honest
   *  "not yet asked" state, added in b108-2fr to stop the panel from
   *  looking like the pendulum had already answered "Yes" on load. */
  answer: PendulumAnswer | null;
  className?: string;
  style?: CSSProperties;
}

export function PendulumDial({
  answer,
  className,
  style,
}: PendulumDialProps) {
  const resting = answer === null;
  const angle = resting ? 0 : ANGLE_FOR[answer];
  const bobColor = resting ? "var(--ink-mute)" : "var(--accent)";
  return (
    <svg
      width={120}
      height={150}
      viewBox="0 0 120 150"
      role="img"
      aria-label={
        resting
          ? "Pendulum at rest — no answer yet"
          : `Pendulum answering ${answer}`
      }
      data-component="pendulum-dial"
      data-answer={resting ? "" : answer}
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
        <circle cx="60" cy="126" r="11" fill={bobColor} />
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
