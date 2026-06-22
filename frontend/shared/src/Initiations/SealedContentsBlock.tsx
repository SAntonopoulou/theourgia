/**
 * SealedContentsBlock — full-bleed "Sealed contents" CTA panel.
 *
 * Per `Theourgia Initiations.dc.html`. Centered panel inside a
 * `--seal-*` palette. Large lock glyph, heading, paragraph of
 * editorial copy explaining the zero-knowledge guarantee, an
 * "Unlock to view" CTA, and a per-read footer note.
 *
 * Uses verbatim editorial copy because the practitioner needs to
 * understand exactly what the server can and cannot see — this is
 * the load-bearing zero-knowledge transparency surface in Phase 05.
 */

import { type CSSProperties, type ReactNode } from "react";

const DEFAULT_BODY =
  "The grade, the date received, the place, who gave and witnessed it, and your notes are encrypted with a key only your client holds. The server cannot read or recover them.";
const DEFAULT_FOOTER =
  "Your passphrase is asked each time — this is the most sensitive record.";

export interface SealedContentsBlockProps {
  /** Heading (defaults to "Sealed contents"). */
  heading?: ReactNode;
  /** Editorial paragraph explaining the seal. */
  body?: ReactNode;
  /** CTA button label (default: "Unlock to view"). */
  unlockLabel?: string;
  /** Per-read footer note. */
  footer?: ReactNode;
  onUnlock?: () => void;
  className?: string;
  style?: CSSProperties;
}

function LockGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function UnlockGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0" />
    </svg>
  );
}

export function SealedContentsBlock({
  heading = "Sealed contents",
  body = DEFAULT_BODY,
  unlockLabel = "Unlock to view",
  footer = DEFAULT_FOOTER,
  onUnlock,
  className,
  style,
}: SealedContentsBlockProps) {
  return (
    <div
      className={className}
      data-component="sealed-contents-block"
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--seal-border)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--seal-soft)",
        padding: "26px 24px",
        textAlign: "center",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--seal)",
          background: "var(--bg-sunk)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--seal-border)",
          marginBottom: 14,
        }}
      >
        <LockGlyph />
      </span>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          color: "var(--ink)",
          marginBottom: 6,
        }}
      >
        {heading}
      </div>
      <p
        style={{
          margin: "0 auto 16px",
          maxWidth: 420,
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
        }}
      >
        {body}
      </p>
      {onUnlock ? (
        <button
          type="button"
          onClick={onUnlock}
          data-unlock-button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--seal)",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
        >
          <UnlockGlyph />
          {unlockLabel}
        </button>
      ) : null}
      {footer ? (
        <div
          data-footer
          style={{
            marginTop: 13,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
