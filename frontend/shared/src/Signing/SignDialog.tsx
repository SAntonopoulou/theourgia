/**
 * SignDialog — themed passphrase prompt for signing a canonical
 * claim with the user's Ed25519 key.
 *
 * Per H01-H03 supplement §S3.3: the dialog always shows the
 * `CanonicalBytes` preview (formatted by default, "Show raw" toggle)
 * + a password input + the reassurance "computed on this device,
 * your key never leaves it" + Sign-and-publish action. Disabled
 * until a passphrase is typed.
 *
 * The actual Ed25519 computation happens in the caller — this is the
 * UI primitive. Caller's `onSign(passphrase)` should:
 *   1. Derive the signing key from the passphrase locally.
 *   2. Compute the signature over the canonical bytes (matching the
 *      backend's canonicalize() exactly).
 *   3. POST to the attestation endpoint.
 *
 * Composes the existing Overlay primitive for focus-trap / ESC / ARIA.
 */

import { type ReactNode, useEffect, useId, useState } from "react";

import { Button } from "../Button/index.js";
import { Overlay } from "../Overlay/Overlay.js";

import { CanonicalBytes } from "./CanonicalBytes.js";

export interface SignDialogProps {
  open: boolean;
  /** The structured claim — passed straight through to CanonicalBytes. */
  canonical: Record<string, unknown>;
  /** Called with the user's passphrase on Sign. */
  onSign: (passphrase: string) => void | Promise<void>;
  onCancel: () => void;
  /** Override the title. Defaults to "Review & sign". */
  title?: ReactNode;
  /** Override the intro copy. */
  body?: ReactNode;
  /** Override the action button label. Defaults to "Sign & publish". */
  signLabel?: string;
  /** Surface an inline error (e.g. "Passphrase didn't unlock the
   *  signing key — try again"). */
  errorMessage?: string;
}

const BODY_DEFAULT =
  "This is what your signature will commit to. Verify it before signing — once signed, these exact bytes are what others check against.";

export function SignDialog({
  open,
  canonical,
  onSign,
  onCancel,
  title = "Review & sign",
  body = BODY_DEFAULT,
  signLabel = "Sign & publish",
  errorMessage,
}: SignDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();
  const errorId = useId();

  const [passphrase, setPassphrase] = useState("");

  useEffect(() => {
    if (open) setPassphrase("");
  }, [open]);

  const submit = () => {
    if (!passphrase) return;
    void onSign(passphrase);
  };

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      ariaLabelledby={titleId}
      ariaDescribedby={bodyId}
    >
      <div
        style={{
          padding: 0,
          width: 540,
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
            gap: 10,
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 20,
              color: "var(--ink)",
              flex: 1,
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
            gap: 15,
          }}
        >
          <p
            id={bodyId}
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
            }}
          >
            {body}
          </p>

          <CanonicalBytes value={canonical} title="Canonical bytes" />

          <label htmlFor={inputId} style={{ display: "block" }}>
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
              Your passphrase
            </span>
            <input
              id={inputId}
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Unlocks your signing key on this device"
              autoComplete="current-password"
              autoFocus
              aria-invalid={errorMessage ? "true" : undefined}
              aria-describedby={errorMessage ? errorId : undefined}
              style={{
                width: "100%",
                border: "1px solid var(--line-2)",
                borderRadius: 8,
                background: "var(--bg-sunk)",
                padding: "10px 12px",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink)",
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

          <p
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            The signature is computed on this device. Your key never leaves it.
          </p>
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
          <Button
            variant="primary"
            onClick={submit}
            disabled={!passphrase}
          >
            {signLabel}
          </Button>
        </footer>
      </div>
    </Overlay>
  );
}
