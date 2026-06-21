/**
 * RevokeDialog — themed prompt for publishing a signed revocation.
 *
 * Per H01-H03 supplement §S3.3: revocation is **append-only**. The
 * original signature stays in the record; the chain shows what was
 * claimed and that the signer later withdrew it. The reason the
 * signer gives becomes part of the bytes the revocation signs over,
 * so it cannot be silently rewritten later — required + non-empty.
 *
 * Tone: care palette throughout (`--revoke`, no red); the lead
 * paragraph honestly says "the original signature stays in the
 * record". This is information, not punishment.
 *
 * Composes the existing Overlay primitive (focus-trap / ESC / ARIA);
 * uses role="alertdialog" since this is a destructive-by-design
 * publication that requires explicit confirmation.
 */

import { type ReactNode, useEffect, useId, useState } from "react";

import { Button } from "../Button/index.js";
import { Overlay } from "../Overlay/Overlay.js";

export interface RevokeDialogProps {
  open: boolean;
  /** Called with the reason on Sign-and-publish. */
  onRevoke: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  /** Override title. Defaults to "Publish a revocation". */
  title?: ReactNode;
  /** Override the lead paragraph. */
  body?: ReactNode;
  /** Override the action button label. Defaults to
   *  "Sign & publish revocation". */
  signLabel?: string;
  /** Surface an inline error if the signing failed locally. */
  errorMessage?: string;
}

const BODY_DEFAULT =
  "This publishes a signed revocation. The original signature stays in the record — the chain shows what was claimed, and that you later withdrew it.";

export function RevokeDialog({
  open,
  onRevoke,
  onCancel,
  title = "Publish a revocation",
  body = BODY_DEFAULT,
  signLabel = "Sign & publish revocation",
  errorMessage,
}: RevokeDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const textareaId = useId();
  const errorId = useId();

  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const ready = reason.trim().length > 0;
  const submit = () => {
    if (!ready) return;
    void onRevoke(reason.trim());
  };

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      ariaLabelledby={titleId}
      ariaDescribedby={bodyId}
      role="alertdialog"
    >
      <div
        style={{
          width: 460,
          maxWidth: "calc(100vw - 32px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              flex: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--revoke)",
              background: "var(--revoke-soft)",
              border: "1px solid var(--line-2)",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M6 6l12 12" />
            </svg>
          </span>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 20,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
        </header>

        <div
          style={{
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            id={bodyId}
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
            }}
          >
            {body}
          </p>

          <label htmlFor={textareaId} style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              Reason (becomes part of the signed bytes)
            </span>
            <textarea
              id={textareaId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why you are withdrawing the claim."
              aria-invalid={errorMessage ? "true" : undefined}
              aria-describedby={errorMessage ? errorId : undefined}
              autoFocus
              style={{
                width: "100%",
                border: "1px solid var(--line-2)",
                borderRadius: 8,
                background: "var(--bg-sunk)",
                padding: "10px 12px",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--ink)",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </label>

          {errorMessage ? (
            <p
              id={errorId}
              role="alert"
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--warn)",
              }}
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!ready}>
            {signLabel}
          </Button>
        </footer>
      </div>
    </Overlay>
  );
}
