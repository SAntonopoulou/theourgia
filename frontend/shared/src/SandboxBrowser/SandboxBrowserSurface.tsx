/**
 * SandboxBrowserSurface — H09 Cluster B surface 13.
 *
 * Honesty rules wired:
 *
 *   * **Persistent rule-36 disclosure band** below the topbar
 *     (NOT a tooltip).
 *   * Expiry pill colors red-orange (`--warn`) when close,
 *     `--ink-mute` otherwise.
 *   * Promote-to-main is --warn-soft (consequential edit;
 *     irrevocable per rule 35). Discard is --ink-mute ghost.
 *   * Empty state copy verbatim.
 */

import type { CSSProperties } from "react";

import {
  SB_CREATED_PREFIX,
  SB_DISCARD_CTA,
  SB_EMPTY_BODY,
  SB_EMPTY_TITLE,
  SB_OPEN_CTA,
  SB_PRESERVE_CTA,
  SB_PROMOTE_CTA,
  SB_RULE_36_DISCLOSURE,
  SB_TITLE,
} from "./copy.js";

export interface SandboxRow {
  id: string;
  label: string;
  /** Origin chip text — e.g. "Decanic Faces v1.5.0". */
  origin: string;
  createdAgo: string;
  /** Display-friendly expiry — e.g. "Expires in 26 days" / "Expires in 2 days". */
  expiresLabel: string;
  /** Render --warn when close to expiry, --ink-mute otherwise. */
  expiryNearby?: boolean;
}

export interface SandboxBrowserSurfaceProps {
  sandboxes: readonly SandboxRow[];
  onOpen?: (id: string) => void;
  onPromote?: (id: string) => void;
  onPreserve?: (id: string) => void;
  onDiscard?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function SandboxBrowserSurface({
  sandboxes,
  onOpen,
  onPromote,
  onPreserve,
  onDiscard,
  className,
  style,
}: SandboxBrowserSurfaceProps) {
  const isEmpty = sandboxes.length === 0;

  return (
    <section
      data-surface="sandbox-browser"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {SB_TITLE}
        </h1>
      </header>

      {/* PERSISTENT rule-36 disclosure — NOT a tooltip. */}
      <div
        data-field="rule-36-disclosure"
        role="note"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 24px",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--sandbox-frame)",
          background: "var(--sandbox-frame-soft)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--sandbox-frame)",
            flex: "none",
          }}
        >
          <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="9" width="16" height="11" rx="2" />
            <path d="M8 9V7a4 4 0 0 1 8 0v2" />
          </svg>
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            lineHeight: 1.4,
          }}
        >
          {SB_RULE_36_DISCLOSURE}
        </span>
      </div>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "22px 24px 48px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {isEmpty ? (
            <div
              data-field="empty-state"
              style={{
                padding: "44px 30px",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-lg)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {SB_EMPTY_TITLE}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink-mute)",
                }}
              >
                {SB_EMPTY_BODY}
              </div>
            </div>
          ) : (
            <>
              <div
                data-field="count-label"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {sandboxes.length}{" "}
                {sandboxes.length === 1 ? "active sandbox" : "active sandboxes"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
                data-field="sandbox-list"
              >
                {sandboxes.map((s) => (
                  <div
                    key={s.id}
                    data-sandbox-id={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "15px 17px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-2)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--r-md)",
                        flex: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--sandbox-frame)",
                        background: "var(--sandbox-frame-soft)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--sandbox-frame)",
                      }}
                    >
                      <svg
                        width={19}
                        height={19}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 19.5h16M5.5 19.5l2-9h9l2 9M9 10.5V7a3 3 0 0 1 6 0v3.5" />
                      </svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        data-field="sandbox-label"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 16,
                          color: "var(--ink)",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 5,
                        }}
                      >
                        <span
                          data-field="sandbox-origin"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "2px 10px",
                            borderRadius: 20,
                            background: "var(--bg-3)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {s.origin}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {SB_CREATED_PREFIX}
                          {s.createdAgo}
                        </span>
                        <span
                          data-field="sandbox-expires"
                          data-near={s.expiryNearby}
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: s.expiryNearby
                              ? "var(--warn)"
                              : "var(--ink-mute)",
                          }}
                        >
                          {s.expiresLabel}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        flex: "none",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onOpen?.(s.id)}
                        data-action="open"
                        style={ghost()}
                      >
                        {SB_OPEN_CTA}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPromote?.(s.id)}
                        data-action="promote"
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--r-md)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--warn-border)",
                          background: "var(--warn-soft)",
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          color: "var(--warn)",
                          cursor: "pointer",
                        }}
                      >
                        {SB_PROMOTE_CTA}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPreserve?.(s.id)}
                        data-action="preserve"
                        style={muteBtn()}
                      >
                        {SB_PRESERVE_CTA}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDiscard?.(s.id)}
                        data-action="discard"
                        style={muteBtn()}
                      >
                        {SB_DISCARD_CTA}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ghost(): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: "var(--r-md)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
    background: "transparent",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: "var(--ink-soft)",
    cursor: "pointer",
  };
}

function muteBtn(): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: "var(--r-md)",
    background: "transparent",
    border: "none",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: "var(--ink-mute)",
    cursor: "pointer",
  };
}
