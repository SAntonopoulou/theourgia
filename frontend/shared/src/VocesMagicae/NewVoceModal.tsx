/**
 * NewVoceModal — 8-step new-voce form.
 *
 * Honesty (H05 §S2.4): Source citation REQUIRED. Save stays
 * disabled until the citation field is non-empty; the input border
 * paints `--accent` while empty (NEVER `--danger`); and the
 * verbatim note "A voce cannot be saved without its source
 * citation." sits below the buttons whenever Save is disabled.
 */

import { type CSSProperties, useState } from "react";

import {
  ELEMENTAL_COLOUR,
  ELEMENTAL_GLYPH,
  IPA_KEYS,
  PLANETARY_GLYPH,
  SCRIPT_OPTIONS,
  VM_CITATION_LABEL,
  VM_CITATION_PLACEHOLDER,
  VM_CITATION_REQUIRED_NOTE,
  VM_CITATION_REQUIRED_TAG,
  VM_ELEMENTAL_LABEL,
  VM_IPA_LABEL,
  VM_IPA_OPTIONAL_TAG,
  VM_IPA_PLACEHOLDER,
  VM_NEW_CANCEL_LABEL,
  VM_NEW_DEFAULT_TEXT,
  VM_NEW_DEFAULT_TRANSLIT,
  VM_NEW_MODAL_TITLE,
  VM_NEW_SAVE_LABEL,
  VM_PLANETARY_LABEL,
  VM_SOURCE_SCRIPT_LABEL,
  VM_TRANSLITERATION_LABEL,
  VM_VOCE_TEXT_LABEL,
  type VoceScript,
} from "./copy.js";

const SCRIM_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(480px, 100%)",
  maxHeight: "88vh",
  overflowY: "auto",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px",
};

const FIELD_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 7,
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
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export interface NewVoceModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (payload: {
    script: VoceScript;
    text: string;
    translit: string;
    ipa: string;
    citation: string;
  }) => void;
  initialText?: string;
  initialTranslit?: string;
  initialScript?: VoceScript;
}

export function NewVoceModal({
  open,
  onClose,
  onSave,
  initialText = VM_NEW_DEFAULT_TEXT,
  initialTranslit = VM_NEW_DEFAULT_TRANSLIT,
  initialScript = "greek",
}: NewVoceModalProps) {
  const [script, setScript] = useState<VoceScript>(initialScript);
  const [text, setText] = useState(initialText);
  const [translit, setTranslit] = useState(initialTranslit);
  const [ipa, setIpa] = useState("");
  const [citation, setCitation] = useState("");

  if (!open) return null;

  const trimmedCitation = citation.trim();
  const saveDisabled = trimmedCitation.length === 0;

  const handleSave = () => {
    if (saveDisabled) return;
    onSave?.({ script, text, translit, ipa, citation });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New voce"
      data-component="new-voce-modal"
      data-save-disabled={saveDisabled}
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div className="scroll" style={PANEL_STYLE}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: "0 0 18px",
          }}
        >
          {VM_NEW_MODAL_TITLE}
        </h2>

        <label style={FIELD_LABEL}>{VM_SOURCE_SCRIPT_LABEL}</label>
        <div
          role="group"
          aria-label="Source script"
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {SCRIPT_OPTIONS.map((opt) => {
            const on = script === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={on}
                data-script={opt.key}
                onClick={() => setScript(opt.key)}
                style={on ? CHIP_ON : CHIP_BASE}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <label style={FIELD_LABEL}>{VM_VOCE_TEXT_LABEL}</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-voce-text
          dir={script === "hebrew" ? "rtl" : "ltr"}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 20,
            marginBottom: 14,
          }}
        />

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={FIELD_LABEL}>{VM_TRANSLITERATION_LABEL}</label>
            <input
              type="text"
              value={translit}
              onChange={(e) => setTranslit(e.target.value)}
              data-voce-translit
              style={{
                width: "100%",
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={FIELD_LABEL}>
              {VM_IPA_LABEL}{" "}
              <span style={{ color: "var(--ink-mute)" }}>
                {VM_IPA_OPTIONAL_TAG}
              </span>
            </label>
            <input
              type="text"
              value={ipa}
              onChange={(e) => setIpa(e.target.value)}
              placeholder={VM_IPA_PLACEHOLDER}
              data-voce-ipa
              style={{
                width: "100%",
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div
          role="group"
          aria-label="IPA keys"
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {IPA_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              data-ipa-key={key}
              onClick={() => setIpa((v) => v + key)}
              style={{
                width: 30,
                height: 30,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--ink-soft)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <label style={FIELD_LABEL}>
          {VM_CITATION_LABEL}{" "}
          <span style={{ color: "var(--accent)" }}>
            {VM_CITATION_REQUIRED_TAG}
          </span>
        </label>
        <input
          type="text"
          value={citation}
          onChange={(e) => setCitation(e.target.value)}
          placeholder={VM_CITATION_PLACEHOLDER}
          aria-required="true"
          data-voce-citation
          data-citation-empty={saveDisabled}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: saveDisabled ? "var(--accent)" : "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            marginBottom: 16,
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={FIELD_LABEL}>{VM_PLANETARY_LABEL}</div>
            <div
              style={{
                fontFamily: "var(--font-glyph)",
                fontSize: 17,
                color: "var(--ink-soft)",
                letterSpacing: "0.12em",
              }}
            >
              {(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const)
                .map((p) => PLANETARY_GLYPH[p])
                .join(" ")}
            </div>
          </div>
          <div>
            <div style={FIELD_LABEL}>{VM_ELEMENTAL_LABEL}</div>
            <div
              style={{
                fontFamily: "var(--font-glyph)",
                fontSize: 16,
                letterSpacing: "0.14em",
              }}
            >
              {(["fire", "water", "air", "earth"] as const).map((e) => (
                <span key={e} style={{ color: ELEMENTAL_COLOUR[e] }}>
                  {ELEMENTAL_GLYPH[e]}{" "}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            data-action="cancel"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {VM_NEW_CANCEL_LABEL}
          </button>
          <button
            type="button"
            data-action="save"
            disabled={saveDisabled}
            onClick={handleSave}
            style={
              saveDisabled
                ? {
                    flex: 1.4,
                    padding: 12,
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-3)",
                    color: "var(--ink-mute)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "not-allowed",
                    opacity: 0.7,
                    border: "none",
                  }
                : {
                    flex: 1.4,
                    padding: 12,
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "none",
                    cursor: "pointer",
                  }
            }
          >
            {VM_NEW_SAVE_LABEL}
          </button>
        </div>

        {saveDisabled ? (
          <p
            data-citation-required-note
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              margin: "10px 0 0",
              textAlign: "center",
            }}
          >
            {VM_CITATION_REQUIRED_NOTE}
          </p>
        ) : null}
      </div>
    </div>
  );
}
