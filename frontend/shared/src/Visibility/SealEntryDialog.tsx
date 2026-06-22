/**
 * SealEntryDialog — type-to-confirm gate for sealing an entry.
 *
 * Per `Theourgia Visibility.dc.html`. Sealing converts the entry to
 * zero-knowledge encryption — the server cannot read it, cannot
 * search it, and cannot recover it if the device's key is lost.
 *
 * The confirm requires:
 *   - single mode: type the entry title verbatim.
 *   - bulk   mode: type `SEAL` (uppercase).
 *
 * Uses the `--seal-*` palette, NOT `--danger` — sealing is
 * irreversible but not destructive in the wellbeing-copy sense.
 */

import { type CSSProperties, useEffect, useId, useState } from "react";

import { Overlay } from "../Overlay/Overlay.js";

export interface SealEntryDialogProps {
  open: boolean;
  /** Entry title for single-mode confirm; absent for bulk. */
  entryTitle?: string;
  /** Number of entries selected in bulk mode (only used when no title). */
  entryCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  style?: CSSProperties;
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={4.5} y={11} width={15} height={9} rx={2} />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

const BODY_BULK =
  "Sealing converts these entries to zero-knowledge encryption. The key never leaves your device.";
const BODY_SINGLE = (title: string) =>
  `Sealing converts “${title}” to zero-knowledge encryption. The key never leaves your device.`;
const EMPHASIS =
  "The server cannot read it, cannot search it, and cannot recover it if your key is ever lost. This cannot be undone.";

export function SealEntryDialog({
  open,
  entryTitle,
  entryCount,
  onConfirm,
  onCancel,
  className,
  style,
}: SealEntryDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const promptId = useId();
  const inputId = useId();

  const isBulk = !entryTitle;
  const required = isBulk ? "SEAL" : entryTitle!;
  const heading = isBulk
    ? `Seal ${entryCount ?? 0} entries?`
    : "Seal this entry?";
  const confirmLabel = isBulk
    ? `Seal ${entryCount ?? 0} entries`
    : "Seal entry";

  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const ready = typed.trim() === required;

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      role="alertdialog"
      ariaLabelledby={titleId}
      ariaDescribedby={bodyId}
    >
      <div
        className={className}
        data-component="seal-entry-dialog"
        data-mode={isBulk ? "bulk" : "single"}
        style={{
          width: "min(440px, calc(100vw - 32px))",
          background: "var(--bg-2)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--seal-border)",
          borderRadius: "var(--r-lg, 14px)",
          padding: 24,
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 13,
            alignItems: "flex-start",
            marginBottom: 13,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              flex: "none",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--seal-soft)",
              color: "var(--seal)",
            }}
          >
            <LockIcon />
          </span>
          <h3
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              lineHeight: 1.18,
              color: "var(--ink)",
              paddingTop: 2,
            }}
          >
            {heading}
          </h3>
        </div>

        <p
          id={bodyId}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
          }}
        >
          {isBulk ? BODY_BULK : BODY_SINGLE(entryTitle!)}
        </p>

        <div
          data-emphasis
          style={{
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            padding: "11px 13px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--seal-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--seal-border)",
            margin: "0 0 16px",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
          }}
        >
          {EMPHASIS}
        </div>

        <div style={{ margin: "4px 0 18px" }}>
          <label
            id={promptId}
            htmlFor={inputId}
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginBottom: 7,
            }}
          >
            {isBulk ? (
              <>
                Type{" "}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink)",
                  }}
                >
                  SEAL
                </span>{" "}
                to confirm
              </>
            ) : (
              <>
                Type the entry title to confirm:{" "}
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: "var(--ink-soft)",
                    fontStyle: "italic",
                  }}
                >
                  {entryTitle}
                </span>
              </>
            )}
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={isBulk ? "SEAL" : entryTitle}
            aria-label="Confirmation text"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            style={{
              width: "100%",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg-sunk)",
              padding: "10px 13px",
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              color: "var(--ink)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink)",
              padding: "9px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => ready && onConfirm()}
            disabled={!ready}
            data-confirm-button
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: "var(--seal)",
              padding: "9px 16px",
              borderRadius: "var(--r-md, 8px)",
              border: "none",
              opacity: ready ? 1 : 0.45,
              cursor: ready ? "pointer" : "not-allowed",
              transition: "opacity 0.15s ease",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
