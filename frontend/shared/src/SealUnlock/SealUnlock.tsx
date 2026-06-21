/**
 * SealUnlock — themed passphrase prompt for unlocking sealed content.
 *
 * Per the H01-H03 supplement S3.1, there are two policies:
 *
 *   policy="session" — Oaths. After a successful unlock the vault
 *     stays unlocked for the session (optional opt-out via the
 *     "Stay unlocked for this session" toggle, default ON).
 *
 *   policy="per-read" — Initiations (stricter). Every read of a sealed
 *     payload re-prompts. The toggle reads "Stay unlocked for 5 minutes"
 *     and defaults OFF — the conscious step is opting INTO the
 *     5-minute window, not out of per-read.
 *
 * Tone discipline: locking is the SAFE action; this dialog opens only
 * when the user has chosen to reveal sealed content. Copy honestly
 * reports that decryption happens locally and the key never leaves
 * the device.
 *
 * Composes the existing Overlay primitive (focus trap, ESC, ARIA).
 */

import { type CSSProperties, useEffect, useId, useState } from "react";

import { Button } from "../Button/index.js";
import { Overlay } from "../Overlay/Overlay.js";

import { LockClosed } from "./icons.js";

export type SealUnlockPolicy = "session" | "per-read";

export interface SealUnlockProps {
  open: boolean;
  /** Drives the "stay unlocked" toggle copy + default. */
  policy?: SealUnlockPolicy;
  /** Called with the passphrase + the user's "stay" choice. The
   *  consumer decrypts in-memory and either keeps the key alive for
   *  the session (policy="session", stay=true) / for 5 minutes
   *  (policy="per-read", stay=true) / drops the key after this read
   *  (policy="per-read", stay=false). */
  onUnlock: (passphrase: string, stay: boolean) => void | Promise<void>;
  onCancel: () => void;
  /** Override the title. Defaults to "Unlock the vault". */
  title?: string;
  /** Override the body copy. Defaults to the canonical text per
   *  policy (session vs per-read). */
  body?: string;
  /** Override the "stay" toggle label. Defaults to the canonical
   *  copy per policy. */
  stayLabel?: string;
  /** Surface a one-line inline error (e.g. "Passphrase didn't
   *  decrypt — try again"). */
  errorMessage?: string;
}

const SESSION_BODY =
  "Your passphrase decrypts sealed oaths on this device only. It is never sent to the server.";
const PER_READ_BODY =
  "Your passphrase decrypts sealed initiations on this device for this single read. It is never sent to the server.";
const SESSION_STAY = "Stay unlocked for this session";
const PER_READ_STAY = "Stay unlocked for 5 minutes";

export function SealUnlock({
  open,
  policy = "session",
  onUnlock,
  onCancel,
  title = "Unlock the vault",
  body,
  stayLabel,
  errorMessage,
}: SealUnlockProps) {
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();
  const errorId = useId();

  // Per S3.1: session unlock defaults to staying-on, per-read defaults
  // to staying-off (the conscious step is opting in to the window).
  const defaultStay = policy === "session";

  const [passphrase, setPassphrase] = useState("");
  const [stay, setStay] = useState(defaultStay);

  // Reset on every open so a fresh prompt never inherits a previous
  // typed value or stay-state.
  useEffect(() => {
    if (open) {
      setPassphrase("");
      setStay(defaultStay);
    }
  }, [open, defaultStay]);

  const bodyText = body ?? (policy === "session" ? SESSION_BODY : PER_READ_BODY);
  const stayText =
    stayLabel ?? (policy === "session" ? SESSION_STAY : PER_READ_STAY);

  const submit = () => {
    if (!passphrase) {
      return;
    }
    void onUnlock(passphrase, stay);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const switchBase: CSSProperties = {
    width: 38,
    height: 22,
    borderRadius: 999,
    padding: 2,
    background: stay ? "var(--seal)" : "var(--bg-sunk)",
    border: "1px solid var(--line-2)",
    display: "inline-flex",
    justifyContent: stay ? "flex-end" : "flex-start",
    flex: "none",
    cursor: "pointer",
  };
  const knobBase: CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: 999,
    background: "var(--bg)",
    boxShadow: "0 1px 2px rgba(0,0,0,.3)",
  };

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      ariaLabelledby={titleId}
      ariaDescribedby={bodyId}
    >
      <div style={{ padding: 24, width: 420, maxWidth: "calc(100vw - 32px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              flex: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--seal)",
              background: "var(--seal-soft)",
              border: "1px solid var(--seal-border)",
            }}
            aria-hidden="true"
          >
            <LockClosed size={17} />
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
        </div>
        <p
          id={bodyId}
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
          }}
        >
          {bodyText}
        </p>
        <label htmlFor={inputId} style={{ display: "none" }}>
          Passphrase
        </label>
        <input
          id={inputId}
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Passphrase"
          autoComplete="current-password"
          aria-invalid={errorMessage ? "true" : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          // The dialog is focus-trapped; the input is the first
          // tabbable so Overlay's auto-focus drops here naturally.
          autoFocus
          style={{
            width: "100%",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "var(--bg-sunk)",
            padding: "11px 13px",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink)",
            marginBottom: errorMessage ? 6 : 14,
            boxSizing: "border-box",
          }}
        />
        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--warn)",
            }}
          >
            {errorMessage}
          </p>
        ) : null}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 16,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            onClick={() => setStay(!stay)}
            role="switch"
            aria-checked={stay}
            aria-label={stayText}
            style={switchBase}
          >
            <span style={knobBase} />
          </button>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          >
            {stayText}
          </span>
        </label>
        <div
          style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
        >
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!passphrase}
          >
            Unlock
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
