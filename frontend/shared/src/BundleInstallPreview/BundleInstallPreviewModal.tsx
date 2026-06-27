/**
 * BundleInstallPreviewModal — H09 Cluster B surface 12.
 *
 * **Honesty rule 34 — DATA ONLY. NEVER RUNS PLUGIN CODE.**
 *
 * Even when the bundle ships a plugin, the preview renders only
 * the data shape + sample rows. The plugin's capability review
 * is a separate flow opened via the optional sub-section CTA.
 *
 * Honesty rules wired:
 *
 *   * Default install path is "Install into sandbox" (--accent)
 *     — the safe place to look. "Install directly" is
 *     --warn-soft (bypasses sandbox, irrevocable per rule 35).
 *   * Plugin sub-section (when bundle ships one) is separated
 *     by --line-2 border-top.
 */

import { type CSSProperties, type ReactNode, useEffect } from "react";

import {
  BIP_CANCEL_CTA,
  BIP_CITATION_GLYPH,
  BIP_INSTALL_DIRECT_CTA,
  BIP_INSTALL_SANDBOX_CTA,
  BIP_LICENSE_HEADING,
  BIP_PLUGIN_SUB_BODY,
  BIP_PLUGIN_SUB_CTA,
  BIP_PLUGIN_SUB_TITLE,
  BIP_SAMPLE_HEADING_PREFIX,
  BIP_SAMPLE_HEADING_SUFFIX,
  BIP_TITLE_PREFIX,
  BIP_WHAT_HEADING,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface BundleAddedShape {
  count: string;
  kind: string;
}

export interface BundleSampleRow {
  /** Single-glyph monogram for the avatar tile. */
  glyph: string;
  title: string;
  detail: string;
}

export interface BundleInstallPreviewModalProps {
  bundleName: string;
  bundleVersion: string;
  citationSource: string;
  shapes: readonly BundleAddedShape[];
  sampleCountLabel: string;
  samples: readonly BundleSampleRow[];
  /** SPDX identifier — e.g. ``CC-BY-SA-4.0``. */
  licenseSpdx: string;
  /** Plain-English summary of the license, e.g. "Free to use
   *  and adapt with attribution; derivatives must share the
   *  same licence." */
  licenseDescription: string;
  /** When set, the bundle ships a plugin and the
   *  sub-section renders + the consumer's callback opens the
   *  Capability Review modal. */
  pluginDescription?: ReactNode;
  onReviewPluginCapabilities?: () => void;
  onCancel: () => void;
  /** Default install path — sandbox-first. */
  onInstallSandbox: () => void;
  /** Bypasses sandbox; --warn-soft chrome. */
  onInstallDirectly: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function BundleInstallPreviewModal({
  bundleName,
  bundleVersion,
  citationSource,
  shapes,
  sampleCountLabel,
  samples,
  licenseSpdx,
  licenseDescription,
  pluginDescription,
  onReviewPluginCapabilities,
  onCancel,
  onInstallSandbox,
  onInstallDirectly,
  className,
  style,
}: BundleInstallPreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      data-surface="bundle-install-preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${BIP_TITLE_PREFIX}${bundleName}`}
        className={className}
        data-modal="bundle-install-preview"
        style={{
          width: 600,
          maxWidth: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 28px 70px rgba(0,0,0,.55)",
          overflow: "hidden",
          ...style,
        }}
      >
        <header
          style={{
            padding: "20px 24px 15px",
            borderBottom: "1px solid var(--line)",
            flex: "none",
          }}
        >
          <h2
            data-field="title"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {BIP_TITLE_PREFIX}
            {bundleName}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 5,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {bundleVersion}
            </span>
            <span
              data-field="citation-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "1px 9px",
                borderRadius: 20,
                background: "var(--remote-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--remote)",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--remote)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {BIP_CITATION_GLYPH}
              </span>
              {citationSource}
            </span>
          </div>
        </header>

        <div
          className="scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 24px",
          }}
        >
          <div style={kicker()}>{BIP_WHAT_HEADING}</div>
          <div
            data-field="shapes-table"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              overflow: "hidden",
              marginBottom: 22,
            }}
          >
            {shapes.map((s, i) => (
              <div
                key={`${s.kind}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 15px",
                  borderBottomWidth: i < shapes.length - 1 ? 1 : 0,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--accent)",
                    width: 36,
                    textAlign: "right",
                  }}
                >
                  {s.count}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {s.kind}
                </span>
              </div>
            ))}
          </div>

          <div style={kicker()}>
            {BIP_SAMPLE_HEADING_PREFIX}
            {sampleCountLabel}
            {BIP_SAMPLE_HEADING_SUFFIX}
          </div>
          <div
            data-field="sample-rows"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 22,
            }}
          >
            {samples.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
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
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                  }}
                >
                  {r.glyph}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {r.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={kicker()}>{BIP_LICENSE_HEADING}</div>
          <div
            data-field="license"
            style={{
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
                marginBottom: 3,
              }}
            >
              {licenseSpdx}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              {licenseDescription}
            </div>
          </div>

          {pluginDescription ? (
            <div
              data-field="plugin-sub-section"
              style={{
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "var(--line-2)",
                paddingTop: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 13,
                  padding: "15px 16px",
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
                    display: "flex",
                    color: "var(--accent)",
                    flex: "none",
                    marginTop: 1,
                  }}
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 3v3.5M15 3v3.5M6 6.5h12v5a6 6 0 0 1-12 0z" />
                    <path d="M12 17.5V21" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {BIP_PLUGIN_SUB_TITLE}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                      lineHeight: 1.5,
                      marginBottom: 11,
                    }}
                  >
                    {pluginDescription} {BIP_PLUGIN_SUB_BODY}
                  </div>
                  <button
                    type="button"
                    onClick={onReviewPluginCapabilities}
                    data-action="review-plugin-capabilities"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
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
                    }}
                  >
                    {BIP_PLUGIN_SUB_CTA}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <footer
          style={{
            flex: "none",
            borderTop: "1px solid var(--line)",
            padding: "15px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel"
            style={ghostBtn()}
          >
            {BIP_CANCEL_CTA}
          </button>
          <button
            type="button"
            onClick={onInstallSandbox}
            data-action="install-sandbox"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {BIP_INSTALL_SANDBOX_CTA}
          </button>
          <button
            type="button"
            onClick={onInstallDirectly}
            data-action="install-directly"
            style={{
              padding: "11px 16px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BIP_INSTALL_DIRECT_CTA}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ghostBtn(): CSSProperties {
  return {
    padding: "11px 16px",
    borderRadius: "var(--r-md)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
    background: "transparent",
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    color: "var(--ink-soft)",
    cursor: "pointer",
  };
}

function kicker(): CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 10,
  };
}
