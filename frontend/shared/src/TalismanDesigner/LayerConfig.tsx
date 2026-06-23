/**
 * LayerConfig — the right-rail settings card for the active layer.
 *
 * Six mode-specific variants per the H05 mockup `layerConfig()`:
 *  · background — Texture chips (6) + caption note
 *  · border     — Style chips (6) + inscription input (RTL Hebrew) + rotation slider
 *  · square     — Embedded square chips (5) + Scale% slider + Position chips (5)
 *  · sigil      — Sigil list (name + opacity slider) + Add a sigil
 *  · inscriptions — List (text + script tag) + Add inscription
 *  · image      — Upload + Opacity slider
 */

import * as React from "react";
import { type CSSProperties, useState } from "react";

import {
  ADD_INSCRIPTION_LABEL,
  ADD_SIGIL_LABEL,
  BACKGROUND_TEXTURE_NOTE,
  BACKGROUND_TEXTURES,
  BORDER_INSCRIPTION_DEFAULT,
  BORDER_STYLES,
  DEMO_INSCRIPTIONS,
  DEMO_LAYER_SIGILS,
  SQUARE_PICKER_OPTIONS,
  SQUARE_POSITIONS,
  UPLOAD_IMAGE_LABEL,
  type TalismanLayerKind,
} from "./copy.js";

const LBL_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const CHIP_BASE: CSSProperties = {
  padding: "7px 12px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const CHIP_ON: CSSProperties = {
  ...CHIP_BASE,
  borderColor: "var(--accent)",
  background: "var(--accent-soft)",
  color: "var(--ink)",
};

function Label({ children }: { children: string }) {
  return <div style={LBL_STYLE}>{children}</div>;
}

function ChipRow({
  options,
  initialIndex = 0,
  ariaLabel,
}: {
  options: readonly string[];
  initialIndex?: number;
  ariaLabel: string;
}) {
  const [sel, setSel] = useState(initialIndex);
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
    >
      {options.map((opt, i) => {
        const on = i === sel;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            data-chip-index={i}
            onClick={() => setSel(i)}
            style={on ? CHIP_ON : CHIP_BASE}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  name,
  min,
  max,
  defaultValue,
}: {
  name: string;
  min: number;
  max: number;
  defaultValue: number;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 12,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          width: 70,
          flex: "none",
        }}
      >
        {name}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        style={{ flex: 1 }}
      />
    </label>
  );
}

export interface LayerConfigProps {
  layer: TalismanLayerKind;
  className?: string;
  style?: CSSProperties;
}

export function LayerConfig({ layer, className, style }: LayerConfigProps) {
  return (
    <div
      data-component="talisman-layer-config"
      data-layer={layer}
      className={className}
      style={style}
    >
      {renderConfig(layer)}
    </div>
  );
}

function renderConfig(layer: TalismanLayerKind): React.ReactElement {
  switch (layer) {
    case "background":
      return (
        <div>
          <Label>Texture</Label>
          <ChipRow
            options={BACKGROUND_TEXTURES}
            initialIndex={2}
            ariaLabel="Texture"
          />
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {BACKGROUND_TEXTURE_NOTE}
          </div>
        </div>
      );

    case "border":
      return (
        <div>
          <Label>Style</Label>
          <ChipRow
            options={BORDER_STYLES}
            initialIndex={0}
            ariaLabel="Border style"
          />
          <div style={{ marginTop: 14 }}>
            <Label>Inscription</Label>
            <input
              type="text"
              defaultValue={BORDER_INSCRIPTION_DEFAULT}
              dir="rtl"
              aria-label="Inscription"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-hebrew)",
                fontSize: 16,
              }}
            />
          </div>
          <Slider name="Rotation" min={-180} max={180} defaultValue={0} />
        </div>
      );

    case "square":
      return (
        <div>
          <Label>Embedded square</Label>
          <ChipRow
            options={SQUARE_PICKER_OPTIONS}
            initialIndex={1}
            ariaLabel="Embedded square"
          />
          <Slider name="Scale %" min={10} max={50} defaultValue={34} />
          <div style={{ marginTop: 12 }}>
            <Label>Position</Label>
            <ChipRow
              options={SQUARE_POSITIONS}
              initialIndex={0}
              ariaLabel="Position"
            />
          </div>
        </div>
      );

    case "sigil":
      return (
        <div>
          <Label>Central sigil(s)</Label>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {DEMO_LAYER_SIGILS.map((sigil) => (
              <div
                key={sigil.id}
                data-sigil-row={sigil.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 11px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-glyph)",
                    color: "var(--accent)",
                  }}
                >
                  ✦
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {sigil.name}
                </span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  defaultValue={sigil.scale}
                  aria-label={`${sigil.name} scale`}
                  style={{ width: 70 }}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            data-action="add-sigil"
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {ADD_SIGIL_LABEL}
          </button>
        </div>
      );

    case "inscriptions":
      return (
        <div>
          <Label>Inscriptions</Label>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {DEMO_INSCRIPTIONS.map((ins) => (
              <div
                key={ins.id}
                data-inscription-row={ins.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 11px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily:
                      ins.script === "Hebrew"
                        ? "var(--font-hebrew)"
                        : "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {ins.text}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {ins.script}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-action="add-inscription"
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {ADD_INSCRIPTION_LABEL}
          </button>
        </div>
      );

    case "image":
      return (
        <div>
          <Label>Charged image</Label>
          <button
            type="button"
            data-action="upload-image"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: 20,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              cursor: "pointer",
            }}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-mute)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4M8 8l4-4 4 4M5 20h14" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
              }}
            >
              {UPLOAD_IMAGE_LABEL}
            </span>
          </button>
          <Slider name="Opacity" min={0} max={100} defaultValue={80} />
        </div>
      );
  }
}
