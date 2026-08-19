/**
 * DirectionalFrameReference — the web reference for a ritual frame.
 *
 * Not a compass: a computer has no needle to turn. A static rose instead — each
 * quarter placed at its bearing (0° north at the top, clockwise) — and the
 * winds' meanings read beneath it. The frames come from installed
 * directional-frame packs (Cardinal, the Anemoi), read client-side.
 */

import type { CSSProperties } from "react";

import type { DirectionalFrame } from "./packFrames.js";

export interface DirectionalFrameReferenceProps {
  frames: readonly DirectionalFrame[];
  className?: string;
  style?: CSSProperties;
}

const ROSE = 200;
const R = 78;
const CX = ROSE / 2;
const CY = ROSE / 2;

function point(degrees: number, radius: number): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180;
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) };
}

function Rose({ frame }: { frame: DirectionalFrame }) {
  return (
    <svg
      width={ROSE}
      height={ROSE}
      viewBox={`0 0 ${ROSE} ${ROSE}`}
      role="img"
      aria-label={`${frame.name} rose`}
    >
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-2)" strokeWidth={1} />
      {frame.quarters.map((q) => {
        const tick = point(q.degrees, R);
        const label = point(q.degrees, R + 14);
        return (
          <g key={q.key}>
            <line x1={CX} y1={CY} x2={tick.x} y2={tick.y} stroke="var(--line)" strokeWidth={1} />
            <circle cx={tick.x} cy={tick.y} r={3} fill="var(--accent)" />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--ink-soft)"
            >
              {q.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DirectionalFrameReference({
  frames,
  className,
  style,
}: DirectionalFrameReferenceProps) {
  if (frames.length === 0) {
    return (
      <div className={className} style={{ padding: "16px 4px", ...style }}>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No directional frames installed. Install a frame pack — Cardinal, the Anemoi — from Packs,
          and its quarters appear here. (The live compass is on the phone; here the frame is shown
          as a rose to read from.)
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto", ...style }}
      className={className}
    >
      {frames.map((frame) => (
        <section
          key={frame.id}
          style={{
            marginBottom: 28,
            paddingBottom: 20,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 19,
              margin: "0 0 4px",
            }}
          >
            {frame.name}
          </h2>
          {frame.summary && (
            <p
              style={{
                color: "var(--ink-mute)",
                fontSize: 13,
                lineHeight: 1.6,
                margin: "0 0 12px",
              }}
            >
              {frame.summary}
            </p>
          )}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Rose frame={frame} />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, minWidth: 220 }}>
              {frame.quarters.map((q) => (
                <li key={q.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>
                      {q.label}
                    </span>
                    <span style={{ color: "var(--ink-mute)", fontSize: 12 }}>
                      {q.key} · {q.degrees}°
                    </span>
                  </div>
                  {q.attribution && (
                    <div style={{ color: "var(--ink-soft)", fontSize: 12.5, lineHeight: 1.5 }}>
                      {q.attribution}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
