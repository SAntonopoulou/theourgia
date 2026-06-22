/**
 * GeoFigureView — single geomantic figure (four rows of 1 or 2 dots).
 *
 * Verbatim from `drawFig()` in `Theourgia Geomancy.dc.html` (lines
 * 178-183). Single point (line==1) → one dot centred; double point
 * (line==2) → two dots side by side.
 *
 * Used in mother cells (large), shield cards (mid), house chart
 * cells (small), and the verdict figure preview.
 */

import { type CSSProperties, Fragment } from "react";

import type { GeoFigure } from "../divination/index.js";

export interface GeoFigureViewProps {
  figure: GeoFigure;
  /** Dot diameter in px. Default 8. */
  dotSize?: number;
  /** Dot color (defaults to --ink-soft). Pass --accent for emphasis. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function GeoFigureView({
  figure,
  dotSize = 8,
  color = "var(--ink-soft)",
  className,
  style,
}: GeoFigureViewProps) {
  const rowGap = Math.max(4, dotSize * 0.7);
  const dotGap = dotSize + 4;

  return (
    <div
      data-component="geo-figure-view"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: rowGap,
        alignItems: "center",
        ...style,
      }}
    >
      {figure.map((line, i) => (
        <div
          key={i}
          data-line-index={i}
          data-line-value={line}
          style={{
            display: "flex",
            gap: dotGap,
            height: dotSize,
          }}
        >
          {line === 1 ? (
            <Pip size={dotSize} color={color} />
          ) : (
            <Fragment>
              <Pip size={dotSize} color={color} />
              <Pip size={dotSize} color={color} />
            </Fragment>
          )}
        </div>
      ))}
    </div>
  );
}

function Pip({ size, color }: { size: number; color: string }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flex: "none",
      }}
      aria-hidden="true"
    />
  );
}
