/**
 * CarriesPanel — the right-side "What this sigil carries" rail.
 *
 * Intention + linked being + linked working + notes + optional
 * citation chrome + the primary "Charge & save" action. Per H05 §S3
 * + §S2.3 the citation badge only appears for modes with a PD
 * source.
 */

import { type CSSProperties } from "react";

import {
  CARRIES_EYEBROW,
  CHARGE_SAVE_BUTTON,
  CHARGE_SAVE_GLYPH,
  INTENTION_LABEL,
  INTENTION_PLACEHOLDER,
  LINKED_BEING_DEFAULT,
  LINKED_BEING_GLYPH_DEFAULT,
  LINKED_BEING_LABEL,
  LINKED_WORKING_LABEL,
  LINKED_WORKING_PLACEHOLDER,
  NOTES_LABEL,
  NOTES_PLACEHOLDER,
  OPTIONAL_TAG,
} from "./copy.js";

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 300px",
  minWidth: 0,
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: 20,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const FIELD_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 6,
};

const OPTIONAL_STYLE: CSSProperties = { color: "var(--ink-mute)" };

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
};

const TEXTAREA_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  resize: "vertical",
};

const SAVE_BUTTON: CSSProperties = {
  marginTop: "auto",
  width: "100%",
  padding: 12,
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  cursor: "pointer",
};

export interface CarriesPanelProps {
  intention: string;
  onIntentionChange: (next: string) => void;
  linkedBeing?: string;
  linkedBeingGlyph?: string;
  citation?: string | null;
  onSave: () => void;
  className?: string;
  style?: CSSProperties;
}

export function CarriesPanel({
  intention,
  onIntentionChange,
  linkedBeing = LINKED_BEING_DEFAULT,
  linkedBeingGlyph = LINKED_BEING_GLYPH_DEFAULT,
  citation = null,
  onSave,
  className,
  style,
}: CarriesPanelProps) {
  return (
    <aside
      className={`scroll sg-side ${className ?? ""}`}
      data-component="sigil-carries-panel"
      style={{ ...RAIL_STYLE, ...style }}
    >
      <div style={EYEBROW}>{CARRIES_EYEBROW}</div>

      <label style={FIELD_LABEL}>{INTENTION_LABEL}</label>
      <textarea
        rows={2}
        value={intention}
        onChange={(e) => onIntentionChange(e.target.value)}
        placeholder={INTENTION_PLACEHOLDER}
        aria-label={INTENTION_LABEL}
        data-intention
        style={{
          ...TEXTAREA_STYLE,
          fontFamily: "var(--font-display)",
          fontSize: 15.5,
          lineHeight: 1.4,
          marginBottom: 16,
        }}
      />

      <label style={FIELD_LABEL}>
        {LINKED_BEING_LABEL}{" "}
        <span style={OPTIONAL_STYLE}>{OPTIONAL_TAG}</span>
      </label>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input
          type="text"
          defaultValue={linkedBeing}
          aria-label={LINKED_BEING_LABEL}
          style={INPUT_STYLE}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-glyph)",
            color: "var(--accent)",
            pointerEvents: "none",
          }}
        >
          {linkedBeingGlyph}
        </span>
      </div>

      <label style={FIELD_LABEL}>
        {LINKED_WORKING_LABEL}{" "}
        <span style={OPTIONAL_STYLE}>{OPTIONAL_TAG}</span>
      </label>
      <input
        type="text"
        placeholder={LINKED_WORKING_PLACEHOLDER}
        aria-label={LINKED_WORKING_LABEL}
        style={{ ...INPUT_STYLE, color: "var(--ink-soft)", marginBottom: 14 }}
      />

      <label style={FIELD_LABEL}>{NOTES_LABEL}</label>
      <textarea
        rows={2}
        placeholder={NOTES_PLACEHOLDER}
        aria-label={NOTES_LABEL}
        style={{
          ...TEXTAREA_STYLE,
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      />

      {citation ? (
        <div
          data-citation
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "9px 11px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg)",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontFamily: "var(--font-glyph)",
              fontSize: 12,
              flex: "none",
            }}
          >
            ‡
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.35,
            }}
          >
            {citation}
          </span>
        </div>
      ) : null}

      <button
        type="button"
        data-action="charge-save"
        onClick={onSave}
        style={SAVE_BUTTON}
      >
        <span aria-hidden="true" style={{ fontFamily: "var(--font-glyph)" }}>
          {CHARGE_SAVE_GLYPH}
        </span>
        {CHARGE_SAVE_BUTTON}
      </button>
    </aside>
  );
}
