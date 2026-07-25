/**
 * IntentCovenantField — the declared intent, before and after sealing
 * (rule 69).
 *
 * Undeclared: a dashed ``--covenant`` frame with the covenant's terms
 * in words — once saved it is sealed with its hour and cannot be
 * rewritten — a textarea, and the single Seal action.
 *
 * Sealed: the covenant rail — solid ``--covenant`` left rail, the
 * text as a blockquote, the hour, and the key fingerprint. There is
 * NO edit affordance in this state, by design; the backend has no
 * update route either.
 */

import { type CSSProperties, useState } from "react";

import type { DeclaredIntentRead } from "../api/types.js";
import { _ } from "../i18n/index.js";
import { shortFingerprint } from "./covenant.js";

export interface IntentCovenantFieldProps {
  /** Null → undeclared (the declare flow renders). */
  intent: DeclaredIntentRead | null;
  /** Seal the intent — fired once; the button disables while pending. */
  onSeal?: (text: string) => void | Promise<void>;
  /** Disables the declare flow (e.g. while the working loads). */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SEAL_ICON = (
  <svg
    width={17}
    height={17}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

function sealedHour(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function IntentCovenantField({
  intent,
  onSeal,
  disabled,
  className,
  style,
}: IntentCovenantFieldProps) {
  const [text, setText] = useState("");
  const [sealing, setSealing] = useState(false);

  if (intent !== null) {
    return (
      <div
        data-component="intent-covenant"
        data-state="sealed"
        className={className}
        style={{
          position: "relative",
          padding: "19px 21px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--covenant-line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--covenant-soft)",
          overflow: "hidden",
          ...style,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            background: "var(--covenant)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "flex", color: "var(--covenant)", flex: "none" }}>
            {SEAL_ICON}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--covenant)",
            }}
          >
            {_("Sealed · cannot be rewritten")}
          </span>
          <span
            data-sealed-hour
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {sealedHour(intent.declared_at)}
          </span>
        </div>
        <blockquote
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 16.5,
            lineHeight: 1.7,
            color: "var(--ink)",
          }}
        >
          “{intent.text}”
        </blockquote>
        <div
          data-fingerprint
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginTop: 13,
            paddingTop: 11,
            borderTop: "1px solid var(--covenant-line)",
          }}
        >
          {_(
            "Signed with your key · {fingerprint} · the text and its hour are part of the record now",
            {
              fingerprint: shortFingerprint(intent.fingerprint),
            },
          )}
        </div>
      </div>
    );
  }

  const empty = text.trim().length === 0;

  async function seal(): Promise<void> {
    if (empty || sealing) return;
    setSealing(true);
    try {
      await onSeal?.(text.trim());
    } finally {
      setSealing(false);
    }
  }

  return (
    <div
      data-component="intent-covenant"
      data-state="undeclared"
      className={className}
      style={{
        padding: "17px 19px",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--covenant-line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
          marginBottom: 13,
        }}
      >
        {_(
          "Say what you are asking for, before you begin. Once saved it is sealed with its hour and cannot be rewritten — the point of the covenant is that your later self cannot move the mark.",
        )}
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={_("What this working is for…")}
        disabled={disabled || sealing}
        aria-label={_("Declared intent")}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.6,
          resize: "vertical",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>
          {_("Sealed at the moment you save it")}
        </span>
        <button
          type="button"
          data-action="seal-intent"
          onClick={() => void seal()}
          disabled={empty || disabled || sealing}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--covenant-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--covenant)",
            color: "var(--covenant)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: empty || disabled || sealing ? "default" : "pointer",
            opacity: empty || disabled ? 0.6 : 1,
          }}
        >
          {SEAL_ICON}
          {sealing ? _("Sealing…") : _("Seal the intent")}
        </button>
      </div>
    </div>
  );
}
