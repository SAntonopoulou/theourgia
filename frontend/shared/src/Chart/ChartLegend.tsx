/**
 * ChartLegend — tabular fallback for the SVG chart wheel.
 *
 * Renders the same placements as :class:`Chart`, but in an
 * accessible-by-default table so screen-reader users get equivalent
 * information without re-deriving it from the SVG geometry.
 */

import type { CSSProperties } from "react";

import type { ChartPlacement } from "./Chart.js";

export interface ChartLegendProps {
  placements: ChartPlacement[];
  className?: string;
  style?: CSSProperties;
}

function formatDegrees(longitude: number): string {
  const deg = Math.floor(longitude % 30);
  const minFrac = (longitude % 1) * 60;
  const min = Math.floor(minFrac);
  return `${deg}°${min.toString().padStart(2, "0")}'`;
}

export function ChartLegend({ placements, className, style }: ChartLegendProps) {
  return (
    <table
      className={className}
      style={{
        borderCollapse: "collapse",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ink-soft)",
        ...style,
      }}
    >
      <caption
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Chart placements: body, sign, degree, house, and motion
      </caption>
      <thead>
        <tr>
          <th style={th}>Body</th>
          <th style={th}>Sign</th>
          <th style={{ ...th, textAlign: "right" }}>Degree</th>
          <th style={{ ...th, textAlign: "right" }}>House</th>
          <th style={{ ...th, textAlign: "center" }}>Motion</th>
        </tr>
      </thead>
      <tbody>
        {placements.map((p) => (
          <tr key={p.body_id}>
            <td style={td}>
              <span
                style={{
                  fontFamily: "var(--font-glyph)",
                  marginRight: 8,
                  color: "var(--accent)",
                }}
                aria-hidden="true"
              >
                {p.glyph}
              </span>
              {p.body_name}
            </td>
            <td style={td}>{p.tropical_sign}</td>
            <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>
              {formatDegrees(p.tropical_longitude)}
            </td>
            <td style={{ ...td, textAlign: "right" }}>{p.house}</td>
            <td style={{ ...td, textAlign: "center" }}>
              {p.is_retrograde ? (
                <span title="Retrograde" style={{ color: "var(--warning)" }}>℞</span>
              ) : (
                <span title="Direct" aria-hidden="true">·</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "6px 12px",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  borderBottom: "1px solid var(--line)",
};

const td: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--line)",
};
