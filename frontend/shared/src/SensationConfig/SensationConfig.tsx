/**
 * SensationConfig — per-marker config panel.
 *
 * Per `Theourgia Body Sensation.dc.html`. A panel with four sections:
 *   1. 12-glyph sensation-type grid (warmth / pressure / vibration /
 *      tingling / pulling / void / electric / expansion / contraction /
 *      pain / pleasure / coolness)
 *   2. Intensity 0-10 slider with "barely / moderate / overwhelming"
 *      affordance labels
 *   3. Fixed 8-swatch palette (Amber · Gold · Green · Cyan · Violet ·
 *      Rose · Clay · Slate)
 *   4. Notes textarea + Delete + Done buttons
 *
 * The 8-swatch palette is intentionally separate from the tradition
 * palette per supplement §S2.
 */

import { type CSSProperties, type ReactNode } from "react";

import type { BodyMarker } from "../BodySilhouette/BodySilhouette.js";

export type SensationType =
  | "warmth"
  | "coolness"
  | "pressure"
  | "vibration"
  | "tingling"
  | "pulling"
  | "void"
  | "electric"
  | "expansion"
  | "contraction"
  | "pain"
  | "pleasure";

export interface SensationTypeMeta {
  label: string;
  color: string;
}

export const SENSATION_TYPES: Record<SensationType, SensationTypeMeta> = {
  warmth: { label: "Warmth", color: "#D98A4E" },
  pressure: { label: "Pressure", color: "#8A7BB0" },
  vibration: { label: "Vibration", color: "#5AA0C0" },
  tingling: { label: "Tingling", color: "#6FBFA0" },
  pulling: { label: "Pulling", color: "#C0A15A" },
  void: { label: "Void", color: "#7C828B" },
  electric: { label: "Electric", color: "#C9A24C" },
  expansion: { label: "Expansion", color: "#7FB069" },
  contraction: { label: "Contraction", color: "#B0786A" },
  pain: { label: "Pain", color: "#C25B53" },
  pleasure: { label: "Pleasure", color: "#C77FA0" },
  coolness: { label: "Coolness", color: "#6E9FC0" },
};

export const SENSATION_TYPE_ORDER: SensationType[] = [
  "warmth",
  "pressure",
  "vibration",
  "tingling",
  "pulling",
  "void",
  "electric",
  "expansion",
  "contraction",
  "pain",
  "pleasure",
  "coolness",
];

export interface PaletteSwatch {
  color: string;
  name: string;
}

export const MARKER_PALETTE: PaletteSwatch[] = [
  { color: "#D98A4E", name: "Amber" },
  { color: "#C9A24C", name: "Gold" },
  { color: "#7FB069", name: "Green" },
  { color: "#5AA0C0", name: "Cyan" },
  { color: "#8A7BB0", name: "Violet" },
  { color: "#C77FA0", name: "Rose" },
  { color: "#C25B53", name: "Clay" },
  { color: "#7C828B", name: "Slate" },
];

export interface SensationConfigProps {
  marker: BodyMarker;
  onChange: (patch: Partial<BodyMarker>) => void;
  onDelete?: () => void;
  onDone?: () => void;
  /** Pre-rendered glyph nodes keyed by sensation-type. Default = dot. */
  glyphs?: Partial<Record<SensationType, ReactNode>>;
  className?: string;
  style?: CSSProperties;
}

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 9,
};

function typeButtonStyle(active: boolean, color: string): CSSProperties {
  return {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    color: active ? color : "var(--ink-mute)",
    background: active
      ? `color-mix(in srgb, ${color} 16%, transparent)`
      : "var(--bg-sunk)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? color : "var(--line)",
    cursor: "pointer",
    padding: 0,
  };
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

export function SensationConfig({
  marker,
  onChange,
  onDelete,
  onDone,
  glyphs,
  className,
  style,
}: SensationConfigProps) {
  const activeType = marker.type as SensationType;

  return (
    <div
      className={className}
      data-component="sensation-config"
      data-marker-id={marker.id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 17,
        ...style,
      }}
    >
      {/* SENSATION TYPE */}
      <div>
        <div style={headingStyle}>Sensation</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 6,
          }}
        >
          {SENSATION_TYPE_ORDER.map((type) => {
            const meta = SENSATION_TYPES[type];
            const on = activeType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onChange({ type, color: meta.color })
                }
                aria-pressed={on}
                title={meta.label}
                aria-label={meta.label}
                style={typeButtonStyle(on, meta.color)}
              >
                {glyphs?.[type] ?? <DefaultGlyph color={meta.color} />}
              </button>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
            marginTop: 8,
          }}
        >
          {SENSATION_TYPES[activeType]?.label ?? activeType}
        </div>
      </div>

      {/* INTENSITY */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 7,
          }}
        >
          <span style={headingStyle}>Intensity</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--accent)",
            }}
          >
            {marker.intensity}
            <span style={{ color: "var(--ink-mute)" }}>/10</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={marker.intensity}
          onChange={(e) =>
            onChange({ intensity: parseInt(e.target.value, 10) })
          }
          aria-label="Intensity from 0 to 10"
          style={{ width: "100%" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-mute)",
            marginTop: 3,
          }}
        >
          <span>barely</span>
          <span>moderate</span>
          <span>overwhelming</span>
        </div>
      </div>

      {/* COLOR */}
      <div>
        <div style={headingStyle}>Colour</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MARKER_PALETTE.map((sw) => {
            const on =
              marker.color.toLowerCase() === sw.color.toLowerCase();
            return (
              <button
                key={sw.color}
                type="button"
                onClick={() => onChange({ color: sw.color })}
                aria-pressed={on}
                aria-label={sw.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: sw.color,
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor: on ? "var(--ink)" : "transparent",
                  boxShadow: "0 0 0 1px var(--line-2)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* NOTES */}
      <div>
        <div style={headingStyle}>Notes</div>
        <textarea
          value={marker.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          placeholder="What did it feel like? Where did it move?"
          style={{
            width: "100%",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: 8,
            background: "var(--bg-sunk)",
            padding: "10px 12px",
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--ink)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 10 }}>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            style={{
              alignSelf: "flex-start",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              padding: "8px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remove this marker"
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              padding: "8px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "transparent",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
