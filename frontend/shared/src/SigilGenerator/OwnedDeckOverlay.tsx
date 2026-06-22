/**
 * OwnedDeckOverlay — personal-use deck-image overlay.
 *
 * Per H05 §S3 + §S2.4 honesty: the overlay never persists and never
 * produces an exportable artefact. The verbatim --warn copy is
 * load-bearing — it stays exactly as written.
 */

import { type CSSProperties, useState } from "react";

import {
  OWNED_DECK_CANCEL,
  OWNED_DECK_CONFIRM,
  OWNED_DECK_OWNERSHIP_LABEL,
  OWNED_DECK_SUB,
  OWNED_DECK_TITLE,
  OWNED_DECK_UPLOAD_LABEL,
  OWNED_DECK_WARN,
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

const UPLOAD_BUTTON: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: 24,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  marginBottom: 16,
  cursor: "pointer",
};

const WARN_BOX: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "11px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--warn-border)",
  borderRadius: "var(--r-md)",
  background: "var(--warn-soft)",
  marginBottom: 20,
};

export interface OwnedDeckOverlayProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: { owned: boolean; fileName: string | null }) => void;
}

export function OwnedDeckOverlay({
  open,
  onClose,
  onConfirm,
}: OwnedDeckOverlayProps) {
  const [owned, setOwned] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Owned-deck overlay"
      data-component="sigil-owned-deck-overlay"
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL_STYLE}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            margin: "0 0 4px",
          }}
        >
          {OWNED_DECK_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 18px",
          }}
        >
          {OWNED_DECK_SUB}
        </p>

        <button type="button" data-action="upload" style={UPLOAD_BUTTON}>
          <svg
            width={22}
            height={22}
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
              fontSize: 13,
              color: "var(--ink-soft)",
            }}
          >
            {fileName ?? OWNED_DECK_UPLOAD_LABEL}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setFileName(e.target.files?.[0]?.name ?? null)
            }
            style={{ display: "none" }}
          />
        </button>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <span
            role="checkbox"
            aria-checked={owned}
            tabIndex={0}
            onClick={() => setOwned((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setOwned((v) => !v);
              }
            }}
            style={{
              width: 18,
              height: 18,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              borderRadius: 4,
              background: owned ? "var(--accent-soft)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              marginTop: 1,
              cursor: "pointer",
            }}
          >
            {owned ? (
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 6.5" />
              </svg>
            ) : null}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            {OWNED_DECK_OWNERSHIP_LABEL}
          </span>
        </label>

        <div data-warn style={WARN_BOX}>
          <span style={{ color: "var(--warn)", flex: "none", marginTop: 1 }}>
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
              lineHeight: 1.4,
            }}
          >
            {OWNED_DECK_WARN}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            data-action="cancel"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 11,
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
            {OWNED_DECK_CANCEL}
          </button>
          <button
            type="button"
            data-action="confirm"
            onClick={() => {
              onConfirm?.({ owned, fileName });
              onClose();
            }}
            style={{
              flex: 1,
              padding: 11,
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
            {OWNED_DECK_CONFIRM}
          </button>
        </div>
      </div>
    </div>
  );
}
