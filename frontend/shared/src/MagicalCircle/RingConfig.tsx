/**
 * RingConfig — the right-rail content card for the active ring kind.
 *
 * 5 variants per the H05 `ringConfig()`:
 *  · inscription — Text (RTL Hebrew default) + Script chips + Direction chips
 *  · glyphs       — Glyph set chips + Rotation slider
 *  · image        — Upload button
 *  · multi        — Sequence preview + Edit sequence button
 *  · blank        — Note only
 */

import * as React from "react";
import { type CSSProperties, useState } from "react";

import {
  BLANK_NOTE,
  GLYPH_SETS,
  GLYPH_SET_LABEL,
  IMAGE_KIND_LABEL,
  IMAGE_UPLOAD_LABEL,
  INSCRIPTION_DEFAULT,
  INSCRIPTION_DIRECTIONS,
  INSCRIPTION_DIRECTION_LABEL,
  INSCRIPTION_SCRIPTS,
  INSCRIPTION_SCRIPT_LABEL,
  INSCRIPTION_TEXT_LABEL,
  MULTI_EDIT_LABEL,
  MULTI_SEQUENCE_LABEL,
  ROTATION_LABEL,
  type RingKind,
} from "./copy.js";

const LBL_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const CHIP_BASE: CSSProperties = {
  padding: "6px 11px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const CHIP_ON: CSSProperties = {
  ...CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

function Label({ children }: { children: string }) {
  return <div style={LBL_STYLE}>{children}</div>;
}

function Chips({
  options,
  initial = 0,
  ariaLabel,
}: {
  options: readonly string[];
  initial?: number;
  ariaLabel: string;
}) {
  const [sel, setSel] = useState(initial);
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
    >
      {options.map((opt, i) => {
        const on = i === sel;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
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

export interface RingConfigProps {
  kind: RingKind;
  className?: string;
  style?: CSSProperties;
}

export function RingConfig({ kind, className, style }: RingConfigProps) {
  return (
    <div
      data-component="magical-circle-ring-config"
      data-ring-kind={kind}
      className={className}
      style={style}
    >
      {renderConfig(kind)}
    </div>
  );
}

function renderConfig(kind: RingKind): React.ReactElement {
  switch (kind) {
    case "inscription":
      return (
        <div>
          <Label>{INSCRIPTION_TEXT_LABEL}</Label>
          <input
            type="text"
            defaultValue={INSCRIPTION_DEFAULT}
            dir="rtl"
            aria-label={INSCRIPTION_TEXT_LABEL}
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
              marginBottom: 12,
            }}
          />
          <Label>{INSCRIPTION_SCRIPT_LABEL}</Label>
          <Chips options={INSCRIPTION_SCRIPTS} ariaLabel="Script" />
          <div style={{ marginTop: 12 }}>
            <Label>{INSCRIPTION_DIRECTION_LABEL}</Label>
            <Chips
              options={INSCRIPTION_DIRECTIONS}
              ariaLabel="Direction"
            />
          </div>
        </div>
      );

    case "glyphs":
      return (
        <div>
          <Label>{GLYPH_SET_LABEL}</Label>
          <Chips options={GLYPH_SETS} ariaLabel="Glyph set" />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                width: 90,
                flex: "none",
              }}
            >
              {ROTATION_LABEL}
            </span>
            <input
              type="range"
              min={0}
              max={359}
              defaultValue={0}
              style={{ flex: 1 }}
            />
          </label>
        </div>
      );

    case "image":
      return (
        <div>
          <Label>{IMAGE_KIND_LABEL}</Label>
          <button
            type="button"
            data-action="upload-image"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
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
            {IMAGE_UPLOAD_LABEL}
          </button>
        </div>
      );

    case "multi":
      return (
        <div>
          <Label>{MULTI_SEQUENCE_LABEL}</Label>
          <div
            style={{
              fontFamily: "var(--font-glyph)",
              fontSize: 18,
              color: "var(--ink-mute)",
              padding: "6px 0",
              letterSpacing: "0.18em",
            }}
          >
            (empty — press Edit to compose your sequence)
          </div>
          <button
            type="button"
            data-action="edit-sequence"
            style={{
              marginTop: 6,
              padding: "7px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {MULTI_EDIT_LABEL}
          </button>
        </div>
      );

    case "blank":
    default:
      return (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          {BLANK_NOTE}
        </div>
      );
  }
}
