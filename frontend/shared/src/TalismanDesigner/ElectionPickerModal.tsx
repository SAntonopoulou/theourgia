/**
 * ElectionPickerModal — opens from the right-rail "Linked election"
 * button. Composes the B60 saved election windows; selection writes
 * the chosen window to the talisman's linkedElectionId.
 *
 * Per H05: passed elections (datetime < now without a recorded
 * consecration working) render the `--warn` "election has passed"
 * note in the right rail — this modal only deals with picking.
 */

import { type CSSProperties, useRef } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  ELECTION_MODAL_SUB,
  ELECTION_MODAL_TITLE,
  ELECTION_SEARCH_PLACEHOLDER,
  type ElectionRow,
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px",
};

export interface ElectionPickerModalProps {
  open: boolean;
  onClose: () => void;
  elections?: readonly ElectionRow[];
  onPick?: (election: ElectionRow) => void;
}

export function ElectionPickerModal({
  open,
  onClose,
  elections = [],
  onPick,
}: ElectionPickerModalProps) {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes the modal (b108-2fy a11y sweep); focus moves to
  // the search input on open (b108-2g1 a11y sweep).
  useEscapeToClose(open, onClose);
  useFocusOnOpen(firstInputRef, open);
  useFocusTrap(panelRef, open);

  if (!open) return null;
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Linked election"
      data-component="talisman-election-modal"
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
          {ELECTION_MODAL_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 18px",
          }}
        >
          {ELECTION_MODAL_SUB}
        </p>
        <input
          ref={firstInputRef}
          type="text"
          placeholder={ELECTION_SEARCH_PLACEHOLDER}
          aria-label="Search elections"
          style={{
            width: "100%",
            padding: "11px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            marginBottom: 14,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {elections.length === 0 ? (
            <div
              style={{
                padding: "18px 4px",
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              No saved elections yet. The Election Finder pipeline
              populates this list once it lands.
            </div>
          ) : null}
          {elections.map((e, i) => {
            const top = i === 0;
            return (
              <button
                key={e.id}
                type="button"
                data-election-id={e.id}
                onClick={() => {
                  onPick?.(e);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: top ? "var(--accent-soft)" : "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-glyph)",
                    color: "var(--accent)",
                    fontSize: 18,
                    flex: "none",
                  }}
                >
                  {e.glyph}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-ui)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                    }}
                  >
                    {e.when}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {e.detail}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                >
                  {e.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
