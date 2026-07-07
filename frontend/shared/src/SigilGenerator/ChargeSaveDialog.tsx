/**
 * ChargeSaveDialog — committed-make moment (H05 §S2.1).
 *
 * The save permanence copy is verbatim: "A saved sigil is
 * permanent. To change it later you make a new version."
 */

import { type CSSProperties, useRef, useState } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  SAVE_CANCEL,
  SAVE_COMMIT,
  SAVE_DIALOG_PERMANENCE,
  SAVE_DIALOG_TITLE,
  SAVE_LAYER_OTHER,
  SAVE_PURPOSE_LABEL,
  SAVE_TITLE_DEFAULT,
  SAVE_TITLE_LABEL,
  SIGIL_PURPOSE_CHIPS,
  type SigilPurpose,
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

const PURPOSE_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-pill, 20px)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const PURPOSE_ON: CSSProperties = {
  ...PURPOSE_BASE,
  borderColor: "var(--accent)",
  background: "var(--accent-soft)",
  color: "var(--ink)",
};

export interface ChargeSaveDialogProps {
  open: boolean;
  onClose: () => void;
  onCommit?: (payload: { title: string; purpose: SigilPurpose }) => void;
  initialTitle?: string;
  initialPurpose?: SigilPurpose;
}

export function ChargeSaveDialog({
  open,
  onClose,
  onCommit,
  initialTitle = SAVE_TITLE_DEFAULT,
  initialPurpose = "consecrated",
}: ChargeSaveDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [purpose, setPurpose] = useState<SigilPurpose>(initialPurpose);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes the dialog (b108-2fy a11y sweep); focus moves to
  // the Title field on open (b108-2g1 a11y sweep).
  useEscapeToClose(open, onClose);
  useFocusOnOpen(firstInputRef, open);
  useFocusTrap(panelRef, open);

  if (!open) return null;

  const handleCommit = () => {
    onCommit?.({ title, purpose });
    onClose();
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Charge and save sigil"
      data-component="sigil-charge-save-dialog"
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
          {SAVE_DIALOG_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 20px",
          }}
        >
          {SAVE_DIALOG_PERMANENCE}
        </p>

        <label style={FIELD_LABEL}>{SAVE_TITLE_LABEL}</label>
        <input
          ref={firstInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-save-title
          aria-label={SAVE_TITLE_LABEL}
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
            marginBottom: 18,
          }}
        />

        <label style={FIELD_LABEL}>{SAVE_PURPOSE_LABEL}</label>
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {SIGIL_PURPOSE_CHIPS.map((chip) => {
            const on = purpose === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={on}
                data-purpose={chip.key}
                onClick={() => setPurpose(chip.key)}
                style={on ? PURPOSE_ON : PURPOSE_BASE}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-action="layer-with-others"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: 11,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-soft)",
            marginBottom: 20,
            background: "transparent",
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
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {SAVE_LAYER_OTHER}
        </button>

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
            {SAVE_CANCEL}
          </button>
          <button
            type="button"
            data-action="commit"
            onClick={handleCommit}
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
            {SAVE_COMMIT}
          </button>
        </div>
      </div>
    </div>
  );
}
