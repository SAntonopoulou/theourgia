/**
 * SealedSaveDialog — committed-make moment with the H05 §E
 * permanence promise + the `--seal` switch.
 *
 * The seal-help copy is load-bearing (mirror of the B54 client-side
 * signing UX from H01-H03): when on, the server stores only
 * ciphertext.
 */

import { type CSSProperties, useState } from "react";

import {
  TL_SAVE_CANCEL,
  TL_SAVE_CONFIRM,
  TL_SAVE_DIALOG_PERMANENCE,
  TL_SAVE_DIALOG_TITLE,
  TL_SAVE_TITLE_LABEL,
  SEAL_HELP_OFF,
  SEAL_HELP_ON,
  SEAL_SWITCH_LABEL,
  TOPBAR_DEFAULT_NAME,
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
  width: "min(440px, 100%)",
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
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

export interface SealedSaveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: { title: string; sealed: boolean }) => void;
  initialTitle?: string;
  /** Defaults `sealed` to true when an Initiation working is linked
   *  (per H05 §E + the surface). */
  initiationLinked?: boolean;
}

export function SealedSaveDialog({
  open,
  onClose,
  onConfirm,
  initialTitle = TOPBAR_DEFAULT_NAME,
  initiationLinked = false,
}: SealedSaveDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [sealed, setSealed] = useState(initiationLinked);

  if (!open) return null;

  const handleSave = () => {
    onConfirm?.({ title, sealed });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save talisman"
      data-component="talisman-save-dialog"
      data-sealed={sealed}
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL_STYLE}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: "0 0 4px",
          }}
        >
          {TL_SAVE_DIALOG_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 20px",
          }}
        >
          {TL_SAVE_DIALOG_PERMANENCE}
        </p>

        <label style={FIELD_LABEL}>{TL_SAVE_TITLE_LABEL}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-save-title
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
            fontSize: 16,
            marginBottom: 16,
          }}
        />

        <label
          data-seal-row
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: sealed
              ? "var(--seal-border)"
              : "var(--line)",
            borderRadius: "var(--r-md)",
            background: sealed ? "var(--seal-soft)" : "var(--bg-2)",
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            role="switch"
            aria-checked={sealed}
            data-seal-switch
            onClick={() => setSealed((v) => !v)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 11,
              background: sealed ? "var(--seal-soft)" : "var(--bg-3)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: sealed ? "var(--seal-border)" : "var(--line-2)",
              position: "relative",
              flex: "none",
              marginTop: 1,
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 1,
                left: sealed ? 17 : 1,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: sealed ? "var(--seal)" : "var(--ink-mute)",
              }}
            />
          </button>
          <span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              {SEAL_SWITCH_LABEL}
            </span>
            <br />
            <span
              data-seal-help
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {sealed ? SEAL_HELP_ON : SEAL_HELP_OFF}
            </span>
          </span>
        </label>

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
            {TL_SAVE_CANCEL}
          </button>
          <button
            type="button"
            data-action="save"
            onClick={handleSave}
            style={{
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
            }}
          >
            {TL_SAVE_CONFIRM}
          </button>
        </div>
      </div>
    </div>
  );
}
