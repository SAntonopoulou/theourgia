/**
 * MotherCell — single Mother figure cell.
 *
 * Verbatim from `motherCell()` in `Theourgia Geomancy.dc.html`
 * (lines 210-222). Renders eyebrow "Mother N" + four lines of dots
 * + the figure name. In paper mode each line is a tap-to-toggle
 * button; in generate mode the lines are read-only display.
 */

import { type CSSProperties } from "react";

import {
  type GeoFigure,
  type GeoLine,
  figureName,
} from "../divination/index.js";

export interface MotherCellProps {
  /** 0-based mother index (0..3). Used in the eyebrow + aria-labels. */
  index: number;
  figure: GeoFigure;
  /** When true, each line becomes a tap-to-toggle button. */
  editable?: boolean;
  /** Fired when an editable line is toggled. Receives the line index
   *  (0..3) and the new value. */
  onToggleLine?: (lineIndex: number, newValue: GeoLine) => void;
  className?: string;
  style?: CSSProperties;
}

export function MotherCell({
  index,
  figure,
  editable = false,
  onToggleLine,
  className,
  style,
}: MotherCellProps) {
  const name = figureName(figure) ?? "—";
  return (
    <div
      data-component="mother-cell"
      data-mother-index={index}
      data-editable={editable ? "true" : "false"}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "16px 14px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: editable ? "var(--line-2)" : "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        minWidth: 118,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 9.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        Mother {index + 1}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {figure.map((line, li) => {
          const dots =
            line === 1 ? (
              <Pip />
            ) : (
              <>
                <Pip />
                <Pip />
              </>
            );
          const row = (
            <div
              style={{
                display: "flex",
                gap: 13,
                height: 9,
                justifyContent: "center",
              }}
            >
              {dots}
            </div>
          );
          if (!editable) {
            return (
              <div
                key={li}
                data-line-index={li}
                data-line-value={line}
                style={{ padding: "4px 0" }}
              >
                {row}
              </div>
            );
          }
          const nextValue: GeoLine = line === 1 ? 2 : 1;
          return (
            <button
              key={li}
              type="button"
              onClick={() => onToggleLine?.(li, nextValue)}
              aria-label={`Toggle line ${li + 1} of Mother ${index + 1}`}
              data-line-index={li}
              data-line-value={line}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                width: 58,
                display: "flex",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {row}
            </button>
          );
        })}
      </div>

      <div
        data-figure-name
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          color: "var(--accent)",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function Pip() {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: "var(--ink-soft)",
      }}
      aria-hidden="true"
    />
  );
}
