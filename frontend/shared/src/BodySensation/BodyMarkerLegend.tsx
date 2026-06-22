/**
 * BodyMarkerLegend — list of body markers in the current record.
 *
 * Per `Theourgia Body Sensation.dc.html`. The legend sits in the
 * right rail; each row shows the marker's glyph in its colour, the
 * sensation type label, a short place line (note or "no note") +
 * intensity, and the view chip ("front", "left profile", "palm").
 * Clicking a row jumps the surface to that view + selects the
 * marker.
 *
 * Empty state renders a quiet italic hint matching the design.
 */

import { type CSSProperties, type ReactNode } from "react";

import type {
  BodyMarker,
  SilhouetteView,
} from "../BodySilhouette/BodySilhouette.js";
import {
  SENSATION_TYPES,
  type SensationType,
} from "../SensationConfig/SensationConfig.js";

const VIEW_LABEL: Record<SilhouetteView, string> = {
  front: "front",
  back: "back",
  left: "left profile",
  right: "right profile",
  palm: "palm",
  sole: "sole",
};

export interface BodyMarkerLegendProps {
  markers: BodyMarker[];
  /** Optional pre-rendered glyph nodes keyed by sensation type. */
  glyphs?: Partial<Record<SensationType, ReactNode>>;
  /** Fires with the marker id; the surface jumps to its view +
   *  selects it. */
  onSelect?: (markerId: string) => void;
  /** Override the heading label (defaults to "This record"). */
  heading?: ReactNode;
  /** Override the empty-state line. */
  emptyLabel?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function DefaultGlyph({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        display: "block",
      }}
    />
  );
}

function pluralizeMarkers(n: number): string {
  return n === 1 ? "1 marking" : `${n} markings`;
}

function shortPlace(notes?: string): string {
  if (!notes || !notes.trim()) return "no note";
  if (notes.length > 34) return `${notes.slice(0, 34)}…`;
  return notes;
}

export function BodyMarkerLegend({
  markers,
  glyphs,
  onSelect,
  heading = "This record",
  emptyLabel = "Nothing marked yet. Choose a sensation above, then tap where you felt it.",
  className,
  style,
}: BodyMarkerLegendProps) {
  return (
    <div
      className={className}
      data-component="body-marker-legend"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: "16px 17px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {heading}
        </span>
        <span
          data-marker-count
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          {pluralizeMarkers(markers.length)}
        </span>
      </div>

      {markers.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {markers.map((m) => {
            const type = m.type as SensationType;
            const meta = SENSATION_TYPES[type];
            const color = m.color || meta?.color || "var(--ink-soft)";
            const typeLabel = meta?.label ?? m.type;
            return (
              <button
                key={m.id}
                type="button"
                data-legend-marker-id={m.id}
                data-legend-marker-view={m.view}
                onClick={() => onSelect?.(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 8px",
                  borderRadius: 8,
                  textAlign: "left",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  cursor: onSelect ? "pointer" : "default",
                  color: "var(--ink)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    flex: "none",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color,
                    background: `color-mix(in srgb, ${color} 20%, transparent)`,
                    borderWidth: 1.5,
                    borderStyle: "solid",
                    borderColor: color,
                  }}
                >
                  {glyphs?.[type] ?? <DefaultGlyph color={color} />}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink)",
                    }}
                  >
                    {typeLabel}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {shortPlace(m.notes)} · intensity {m.intensity}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    color: "var(--ink-mute)",
                    textTransform: "capitalize",
                  }}
                >
                  {VIEW_LABEL[m.view]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
