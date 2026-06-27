/**
 * KeyRotation — H10 Cluster B5 surface.
 *
 * Current-key card + 4-step rotation wizard + trusted-key history list
 * + emergency-revocation block (--warn-soft, NEVER --danger).
 */

import type { CSSProperties } from "react";

import {
  BUTTONS,
  CHIPS,
  FIELD_LABELS,
  HEADERS,
  REVOKE_BODY,
  ROTATION_STEPS,
} from "./copy.js";

export interface KeyHistoryEntry {
  fingerprint: string;
  retiredOn: string;
}

export interface CurrentKey {
  fingerprint: string;
  /** Display-friendly "14 March 2026". */
  createdOn: string;
  /** Display-friendly "2 hours ago". */
  lastUsed: string;
}

export interface KeyRotationSurfaceProps {
  current: CurrentKey;
  history?: readonly KeyHistoryEntry[];
  busy?: boolean;
  onBeginRotation?: () => void;
  onRevoke?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "26px 24px 48px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
};

const DL_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function KeyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l8-8M16 5l2 2M14 7l2 2" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l9 16H3z" />
      <path d="M12 9v4M12 16h.01" />
    </svg>
  );
}

export function KeyRotationSurface({
  current,
  history = [],
  busy = false,
  onBeginRotation,
  onRevoke,
  className,
  style,
}: KeyRotationSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <section
        style={{
          padding: "18px 20px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 13,
          }}
        >
          <span style={{ display: "flex", color: "var(--peer-ok)" }}>
            <KeyIcon />
          </span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink)",
            }}
          >
            {HEADERS.currentKey}
          </div>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "1px 9px",
              borderRadius: "var(--r-pill)",
              background: "var(--peer-ok-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--peer-ok-border)",
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              color: "var(--peer-ok)",
            }}
          >
            {CHIPS.active}
          </span>
        </div>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "8px 18px",
            margin: 0,
          }}
        >
          <dt style={DL_LABEL}>{FIELD_LABELS.fingerprint}</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          >
            {current.fingerprint}
          </dd>
          <dt style={DL_LABEL}>{FIELD_LABELS.created}</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
            }}
          >
            {current.createdOn}
          </dd>
          <dt style={DL_LABEL}>{FIELD_LABELS.lastUsed}</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
            }}
          >
            {current.lastUsed}
          </dd>
        </dl>
      </section>

      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {HEADERS.rotate}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginBottom: 14,
          }}
        >
          {HEADERS.rotateSubtitle}
        </div>
        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {ROTATION_STEPS.map((step, idx) => (
            <li
              key={step.n}
              style={{
                display: "flex",
                gap: 14,
                paddingBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: "none",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    background: "var(--bg-2)",
                    color: "var(--ink-mute)",
                  }}
                >
                  {step.n}
                </span>
                {idx < ROTATION_STEPS.length - 1 ? (
                  <span
                    style={{
                      flex: 1,
                      width: 1,
                      background: "var(--line)",
                      marginTop: 4,
                    }}
                  />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 6,
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={onBeginRotation}
            style={{
              padding: "11px 20px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {BUTTONS.beginRotation}
          </button>
        </div>
      </section>

      <section>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {HEADERS.history}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {HEADERS.historySubtitle}
        </div>
        {history.length === 0 ? (
          <div
            style={{
              padding: "16px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            No retired keys yet. Your trusted history will appear here
            after your first rotation.
          </div>
        ) : (
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              overflow: "hidden",
            }}
          >
            {history.map((h, idx) => (
              <div
                key={h.fingerprint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 15px",
                  borderBottomWidth:
                    idx < history.length - 1 ? 1 : 0,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {h.fingerprint}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  retired {h.retiredOn}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--warn-border)",
          borderRadius: "var(--r-md)",
          background: "var(--warn-soft)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 7,
          }}
        >
          <span style={{ display: "flex", color: "var(--warn)" }}>
            <WarnIcon />
          </span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {HEADERS.emergencyRevoke}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
            marginBottom: 13,
          }}
        >
          {REVOKE_BODY}
        </div>
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          style={{
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--warn-border)",
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--warn)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {BUTTONS.revokeThisKey}
        </button>
      </section>
    </div>
  );
}
