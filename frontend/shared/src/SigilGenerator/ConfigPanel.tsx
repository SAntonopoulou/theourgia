/**
 * ConfigPanel — the per-mode config card sitting above the preview.
 *
 * Renders one of 11 variants per mode. Each variant follows the
 * same shape: small eyebrow label + control(s). The variants are
 * verbatim from the mockup's `config()` method (lines 315-352).
 */

import * as React from "react";
import { type CSSProperties, useState } from "react";

import { type PlanetKey } from "../workshop/index.js";

/** UI-level curve family — includes the design's "bezier" option even
 *  though the engine doesn't render bezier directly; the preview maps
 *  it to the closest engine family at render. */
export type CurveFamilyUI = "bezier" | "rose" | "lissajous" | "polar";

import {
  CONFIG_LABELS,
  CONFIG_PLACEHOLDER_PROMPT,
  FORMULA_DEFAULT,
  FORMULA_HELP,
  FORMULA_RENDER_LABEL,
  FREEFORM_HELP,
  GEMATRIA_CIPHERS,
  GREEK_STYLES,
  GREEK_TRANSLIT_DEFAULT,
  HEBREW_STYLES,
  HEBREW_TRANSLIT_DEFAULT,
  IMAGE_CHOOSE_LABEL,
  INTENTION_DEFAULT,
  PLANETARY_TILES,
  ROSE_SCRIPTS,
  ROSETTE_VARIANTS,
  SALT_PLACEHOLDER,
  SIGIL_CURVE_FAMILIES,
  SPARE_TOGGLE_LABEL,
  type SigilMode,
} from "./copy.js";

export interface ConfigPanelProps {
  mode: SigilMode;
  /** Active planetary square — only meaningful for kamea mode. */
  square: PlanetKey;
  onSquareChange: (next: PlanetKey) => void;
  /** Active curve family — only meaningful for hashed mode. UI-level
   *  type so "bezier" (a design picker option) is permitted; the
   *  surface maps it to an engine family at render time. */
  family: CurveFamilyUI;
  onFamilyChange: (next: CurveFamilyUI) => void;
  /** Intention text — shown read-only in `spare` config. */
  intention?: string;
  /** Optional formula error to display under the formula input. */
  formulaError?: string | null;
  className?: string;
  style?: CSSProperties;
}

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 9,
};

const CHIP_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
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

const TEXT_INPUT: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
};

function Eyebrow({ children }: { children: string }) {
  return <div style={EYEBROW}>{children}</div>;
}

function PillRow({
  options,
  selectedIndex = 0,
  onSelect,
  ariaLabel,
}: {
  options: readonly string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  ariaLabel: string;
}) {
  const [sel, setSel] = useState(selectedIndex);
  const handlePick = (i: number) => {
    setSel(i);
    onSelect?.(i);
  };
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
            onClick={() => handlePick(i)}
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
  unit = "·",
}: {
  name: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          width: 110,
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
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--accent)",
          width: 46,
          textAlign: "right",
        }}
      >
        {v}
        {unit !== "·" ? unit : ""}
      </span>
    </label>
  );
}

export function ConfigPanel(props: ConfigPanelProps) {
  const {
    mode,
    square,
    onSquareChange,
    family,
    onFamilyChange,
    intention = INTENTION_DEFAULT,
    formulaError = null,
    className,
    style,
  } = props;

  return (
    <div
      data-component="sigil-config-panel"
      data-mode={mode}
      className={className}
      style={style}
    >
      {renderConfig({
        mode,
        square,
        onSquareChange,
        family,
        onFamilyChange,
        intention,
        formulaError,
      })}
    </div>
  );
}

function renderConfig(p: {
  mode: SigilMode;
  square: PlanetKey;
  onSquareChange: (next: PlanetKey) => void;
  family: CurveFamilyUI;
  onFamilyChange: (next: CurveFamilyUI) => void;
  intention: string;
  formulaError: string | null;
}): React.ReactElement {
  const {
    mode,
    square,
    onSquareChange,
    family,
    onFamilyChange,
    intention,
    formulaError,
  } = p;

  switch (mode) {
    case "kamea":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.planetary_square}</Eyebrow>
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {PLANETARY_TILES.map((tile) => {
              const on = square === tile.key;
              return (
                <button
                  key={tile.key}
                  type="button"
                  aria-pressed={on}
                  data-square={tile.key}
                  onClick={() => onSquareChange(tile.key)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    padding: "8px 11px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--accent)" : "var(--line)",
                    borderRadius: "var(--r-md)",
                    background: on ? "var(--accent-soft)" : "var(--bg)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-glyph)",
                      fontSize: 17,
                      color: on ? "var(--accent)" : "var(--ink-soft)",
                    }}
                  >
                    {tile.glyph}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {tile.order}×{tile.order}
                  </span>
                </button>
              );
            })}
          </div>
          <Eyebrow>{CONFIG_LABELS.gematria_cipher}</Eyebrow>
          <PillRow options={GEMATRIA_CIPHERS} ariaLabel="Gematria cipher" />
        </div>
      );

    case "hashed": {
      const familyIndex = SIGIL_CURVE_FAMILIES.findIndex(
        (f) => f.key === family,
      );
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.curve_family}</Eyebrow>
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
            role="group"
            aria-label="Curve family"
          >
            {SIGIL_CURVE_FAMILIES.map((f) => {
              const on = family === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  data-curve-family={f.key}
                  onClick={() => onFamilyChange(f.key)}
                  style={on ? CHIP_ON : CHIP_BASE}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginBottom: 14 }}>
            <Eyebrow>{CONFIG_LABELS.salt}</Eyebrow>
            <input
              type="text"
              placeholder={SALT_PLACEHOLDER}
              style={TEXT_INPUT}
            />
          </div>
          <Slider
            name={CONFIG_LABELS.point_count}
            min={50}
            max={2000}
            defaultValue={400}
          />
          {/* Suppress unused warning when familyIndex isn't read. */}
          {familyIndex < -1 ? null : null}
        </div>
      );
    }

    case "harmonograph":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.gematria_cipher}</Eyebrow>
          <PillRow
            options={GEMATRIA_CIPHERS}
            selectedIndex={1}
            ariaLabel="Gematria cipher"
          />
          <div style={{ height: 14 }} />
          <Slider name={CONFIG_LABELS.damping} min={0} max={5} defaultValue={1} />
          <div style={{ height: 10 }} />
          <Slider
            name={CONFIG_LABELS.duration_seconds}
            min={1}
            max={10}
            defaultValue={4}
          />
        </div>
      );

    case "formula":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.parametric_formula}</Eyebrow>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              defaultValue={FORMULA_DEFAULT}
              data-formula-input
              aria-label={CONFIG_LABELS.parametric_formula}
              style={{ ...TEXT_INPUT, flex: 1 }}
            />
            <button
              type="button"
              style={{
                padding: "9px 16px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
            >
              {FORMULA_RENDER_LABEL}
            </button>
          </div>
          {formulaError ? (
            <div
              data-formula-error
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--warn)",
                background: "var(--warn-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-sm)",
                padding: "6px 10px",
                marginBottom: 10,
              }}
            >
              {formulaError}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            {FORMULA_HELP}
          </div>
          <PillRow
            options={GEMATRIA_CIPHERS}
            selectedIndex={1}
            ariaLabel="Gematria cipher"
          />
        </div>
      );

    case "spare":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.intention}</Eyebrow>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
              padding: "4px 0 12px",
            }}
          >
            {intention}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <span
              role="switch"
              aria-checked="true"
              style={{
                width: 36,
                height: 20,
                borderRadius: 11,
                background: "var(--accent-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--accent)",
                position: "relative",
                flex: "none",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  right: 1,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }}
              />
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              {SPARE_TOGGLE_LABEL}
            </span>
          </label>
        </div>
      );

    case "hebrew":
    case "greek": {
      const styles = mode === "hebrew" ? HEBREW_STYLES : GREEK_STYLES;
      const dflt =
        mode === "hebrew" ? HEBREW_TRANSLIT_DEFAULT : GREEK_TRANSLIT_DEFAULT;
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.transliteration_assist}</Eyebrow>
          <input
            type="text"
            defaultValue={dflt}
            dir={mode === "hebrew" ? "rtl" : "ltr"}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily:
                mode === "hebrew" ? "var(--font-hebrew)" : "var(--font-serif)",
              fontSize: 15,
              marginBottom: 14,
            }}
          />
          <Eyebrow>{CONFIG_LABELS.letterform}</Eyebrow>
          <PillRow options={styles} ariaLabel={CONFIG_LABELS.letterform} />
        </div>
      );
    }

    case "rose":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.script}</Eyebrow>
          <PillRow options={ROSE_SCRIPTS} ariaLabel="Script" />
        </div>
      );

    case "rosette":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.rosette_variant}</Eyebrow>
          <PillRow options={ROSETTE_VARIANTS} ariaLabel="Rosette variant" />
        </div>
      );

    case "image":
      return (
        <div>
          <Eyebrow>{CONFIG_LABELS.source_image}</Eyebrow>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4M8 8l4-4 4 4M5 20h14" />
            </svg>
            {IMAGE_CHOOSE_LABEL}
          </button>
          <Slider
            name={CONFIG_LABELS.vectorize_threshold}
            min={10}
            max={200}
            defaultValue={75}
          />
        </div>
      );

    case "freeform":
      return (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          {FREEFORM_HELP}
        </div>
      );

    default:
      return (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          {CONFIG_PLACEHOLDER_PROMPT}
        </div>
      );
  }
}
