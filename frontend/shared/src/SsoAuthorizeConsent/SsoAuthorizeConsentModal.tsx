/**
 * SsoAuthorizeConsentModal — H08 §S3 Cluster A surface 13.
 *
 * Faithful port of ``Theourgia SSO Authorize Consent.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **No central SSO authority** (H08 rule 23). The consent
 *     moment is point-to-point: the requesting host shows its
 *     DID + `‡ from {instance}` chip in `--remote` chrome, and
 *     the user grants ONE assertion to ONE hub. There is no
 *     "Theourgia ID" or third-party broker — only the two
 *     parties + the local trust store.
 *
 *   * **Three mandatory sections in fixed order**:
 *
 *       What the hub wants to verify   → identity DID (--font-mono)
 *       What the hub will receive      → minimal claims list
 *       What this assertion authorizes → scope + expiry + revoke path
 *
 *     If the consumer omits any section's value the surface
 *     refuses to render (asserts at runtime in dev).
 *
 *   * **"NOT a login" callout is verbatim** in `--warn-soft`. The
 *     copy is rule-level — every word matches the brief.
 *
 *   * The dialog never collects credentials. The Approve CTA
 *     fires `onApprove` so the consumer can mint the assertion
 *     against the local key store; the user does not type a
 *     password into this surface.
 */

import { type CSSProperties, useEffect, useId } from "react";

import {
  SSO_APPROVE,
  SSO_DECLINE,
  SSO_DIALOG_LABEL,
  SSO_FROM_GLYPH,
  SSO_FROM_PREFIX,
  SSO_LABEL_AUTHORIZES,
  SSO_LABEL_RECEIVE,
  SSO_LABEL_VERIFY,
  SSO_NOT_A_LOGIN,
  SSO_TITLE_SUFFIX,
} from "./copy.js";

export interface SsoAuthorizeConsentModalProps {
  /** Hub or app display name. Title becomes `{hubName} is
   *  requesting access`. */
  hubName: string;
  /** Source instance for the `‡ from {instance}` chip. */
  fromInstance: string;
  /** Identity DID the hub wants to verify — rendered verbatim
   *  in --font-mono. */
  identityDid: string;
  /** What the hub will receive — a single line, e.g.
   *  "Your display name · your tradition tag(s) · nothing else". */
  willReceive: string;
  /** Verbose paragraph describing the scope, expiry, and revoke
   *  path. */
  authorizes: string;
  /** Fired when Decline is tapped. */
  onDecline: () => void;
  /** Fired when Approve is tapped. */
  onApprove: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const DIALOG: CSSProperties = {
  width: 560,
  maxWidth: "100%",
  background: "var(--bg)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 28px 70px rgba(0,0,0,.55)",
  overflow: "hidden",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 5,
};

// ─── Component ─────────────────────────────────────────────────────

export function SsoAuthorizeConsentModal({
  hubName,
  fromInstance,
  identityDid,
  willReceive,
  authorizes,
  onDecline,
  onApprove,
  className,
  style,
}: SsoAuthorizeConsentModalProps) {
  const titleId = useId();

  if (
    !hubName ||
    !fromInstance ||
    !identityDid ||
    !willReceive ||
    !authorizes
  ) {
    // The three mandatory sections + chrome MUST be populated.
    throw new Error(
      "SsoAuthorizeConsentModal: hubName, fromInstance, identityDid, willReceive, and authorizes are all required.",
    );
  }

  // Escape → decline. Cancelling on Esc honours the "no implicit
  // approval" rule — the consent surface must take an explicit
  // affirmative action.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDecline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDecline]);

  return (
    <div
      style={SCRIM}
      data-surface="sso-authorize-consent"
      onClick={(e) => {
        // Scrim click → decline. Wraps the same "no implicit
        // approval" intent.
        if (e.target === e.currentTarget) onDecline();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={SSO_DIALOG_LABEL}
        aria-labelledby={titleId}
        className={className}
        style={{ ...DIALOG, ...style }}
        data-modal="sso-authorize-consent"
      >
        <header
          style={{
            padding: "22px 26px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              margin: "0 0 8px",
            }}
            data-field="title"
          >
            {hubName}
            {SSO_TITLE_SUFFIX}
          </h2>
          <div
            data-field="from-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "3px 10px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: 20,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--remote)",
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontFamily: "var(--font-glyph)" }}
            >
              {SSO_FROM_GLYPH}
            </span>
            <span>
              {SSO_FROM_PREFIX}
              {fromInstance}
            </span>
          </div>
        </header>

        <div style={{ padding: "20px 26px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div data-field="verify">
              <div style={SECTION_LABEL}>{SSO_LABEL_VERIFY}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
                data-field="verify-value"
              >
                {identityDid}
              </div>
            </div>
            <div data-field="receive">
              <div style={SECTION_LABEL}>{SSO_LABEL_RECEIVE}</div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink-soft)",
                }}
                data-field="receive-value"
              >
                {willReceive}
              </div>
            </div>
            <div data-field="authorizes">
              <div style={SECTION_LABEL}>{SSO_LABEL_AUTHORIZES}</div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink-soft)",
                  lineHeight: 1.5,
                }}
                data-field="authorizes-value"
              >
                {authorizes}
              </div>
            </div>
          </div>
          <div
            data-field="not-a-login-callout"
            role="note"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                color: "var(--warn)",
                flex: "none",
                marginTop: 1,
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
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                lineHeight: 1.45,
              }}
            >
              {SSO_NOT_A_LOGIN}
            </span>
          </div>
        </div>

        <footer
          style={{
            padding: "16px 26px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onDecline}
            data-action="decline"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {SSO_DECLINE}
          </button>
          <button
            type="button"
            onClick={onApprove}
            data-action="approve"
            style={{
              padding: "11px 24px",
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
            {SSO_APPROVE}
          </button>
        </footer>
      </div>
    </div>
  );
}
