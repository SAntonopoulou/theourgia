/**
 * SandboxDetailSurface — H09 Cluster B surface 14.
 *
 * Honesty rules wired:
 *
 *   * **Persistent rule-36 disclosure band** below the topbar.
 *   * Every content card wrapped in SandboxFrame — visually
 *     impossible to confuse with main-vault content.
 *   * Expiry callout in --accent-soft.
 *   * Promote --warn-soft · Discard ghost.
 */

import type { CSSProperties, ReactNode } from "react";

import {
  SD_DISCARD_CTA,
  SD_EXPIRY_PREFIX,
  SD_EXPIRY_SUFFIX,
  SD_INTRO,
  SD_PROMOTE_CTA,
  SD_RULE_36_DISCLOSURE,
} from "./copy.js";
import { SandboxFrame } from "./SandboxFrame.js";

export interface SandboxContentCard {
  id: string;
  /** Single-glyph monogram. */
  glyph: string;
  title: string;
  ruler?: string;
  body: ReactNode;
}

export interface SandboxDetailSurfaceProps {
  /** Sandbox label, shown in breadcrumb. */
  sandboxLabel: string;
  /** Display-friendly expiry date — e.g. "23 July 2026". */
  expiresAtLabel: string;
  cards: readonly SandboxContentCard[];
  onBreadcrumbHome?: () => void;
  onPromote?: () => void;
  onDiscard?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function SandboxDetailSurface({
  sandboxLabel,
  expiresAtLabel,
  cards,
  onBreadcrumbHome,
  onPromote,
  onDiscard,
  className,
  style,
}: SandboxDetailSurfaceProps) {
  return (
    <section
      data-surface="sandbox-detail"
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
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={onBreadcrumbHome}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Sandbox
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            data-field="sandbox-label"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {sandboxLabel}
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onPromote}
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
            {SD_PROMOTE_CTA}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            data-action="discard"
            style={{
              padding: "8px 13px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {SD_DISCARD_CTA}
          </button>
        </div>
      </header>

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
          {SD_RULE_36_DISCLOSURE}
        </span>
      </div>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "22px 24px 40px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p
            data-field="intro"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
              lineHeight: 1.55,
              margin: "0 0 18px",
            }}
          >
            {SD_INTRO}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 13,
            }}
            data-field="content-cards"
          >
            {cards.map((c) => (
              <SandboxFrame
                key={c.id}
                style={{ padding: "15px 16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    paddingRight: 74,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      flex: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line-2)",
                    }}
                  >
                    {c.glyph}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        color: "var(--ink)",
                        lineHeight: 1.15,
                      }}
                    >
                      {c.title}
                    </div>
                    {c.ruler ? (
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {c.ruler}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "var(--ink-soft)",
                  }}
                >
                  {c.body}
                </div>
              </SandboxFrame>
            ))}
          </div>

          <div
            data-field="expiry-callout"
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "15px 17px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--accent-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                color: "var(--accent)",
                flex: "none",
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
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              {SD_EXPIRY_PREFIX}
              {expiresAtLabel}
              {SD_EXPIRY_SUFFIX}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
