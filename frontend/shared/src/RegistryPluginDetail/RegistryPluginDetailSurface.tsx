/**
 * RegistryPluginDetailSurface — H09 Cluster A surface 8.
 *
 * Honesty rules wired:
 *
 *   * Tier-3 (Unverified): persistent `--warn-soft` banner with
 *     verbatim rule-33 disclosure.
 *   * Tombstoned: persistent `--warn-soft` banner with verbatim
 *     withdrawal reason + `‡ tombstoned by author` chip. Install
 *     CTA flips to "Install anyway" (`--warn`).
 *   * **Capabilities rendered read-only** at this stage — they
 *     are review-only until the Capability Review modal opens
 *     post-install-tap.
 *   * Version history surfaces date + notes per release — NEVER
 *     download counts.
 */

import type { CSSProperties, ReactNode } from "react";

import { PluginKindIcon } from "../InstalledPlugins/PluginKindIcon.js";
import type { PluginKind } from "../InstalledPlugins/copy.js";
import {
  CapabilityRow,
  type CapabilityRowData,
} from "../PluginDetail/CapabilityRow.js";
import type { PluginExtensionPoint } from "../PluginDetail/PluginDetailSurface.js";
import { TierBadge } from "../RegistryBrowser/TierBadge.js";
import type { RegistryTier } from "../RegistryBrowser/copy.js";
import {
  RPD_BREADCRUMB_REGISTRY,
  RPD_CAPABILITIES_HEADING,
  RPD_CAPABILITIES_SUB,
  RPD_DESCRIPTION_HEADING,
  RPD_EXT_POINTS_HEADING,
  RPD_INSTALL_ANYWAY_CTA,
  RPD_INSTALL_CTA,
  RPD_LABEL_AUTHOR,
  RPD_LABEL_HOMEPAGE,
  RPD_LABEL_LICENSE,
  RPD_TIER3_DISCLOSURE,
  RPD_TOMBSTONE_BADGE,
  RPD_TOMBSTONE_PREFIX,
  RPD_VERSION_HISTORY_HEADING,
  RPD_VIEW_AUTHOR_CTA,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface RegistryVersionEntry {
  /** e.g. `v2.1.0`. */
  version: string;
  /** Display-friendly date — `"2 days ago"`. */
  date: string;
  /** One-line release notes. */
  notes: string;
}

export interface RegistryPluginDetailSurfaceProps {
  name: string;
  version: string;
  kind: PluginKind;
  tier: Exclude<RegistryTier, "all">;
  author: string;
  license: string;
  homepage?: string;
  description: ReactNode;
  capabilities: readonly CapabilityRowData[];
  extensionPoints: readonly PluginExtensionPoint[];
  versions: readonly RegistryVersionEntry[];
  /** When set, the surface renders the tombstone banner with
   *  this reason and the Install CTA flips to "Install anyway"
   *  in `--warn-soft` chrome. */
  tombstoneReason?: string;
  onBreadcrumbHome?: () => void;
  onInstall?: () => void;
  onViewAuthor?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function RegistryPluginDetailSurface({
  name,
  version,
  kind,
  tier,
  author,
  license,
  homepage,
  description,
  capabilities,
  extensionPoints,
  versions,
  tombstoneReason,
  onBreadcrumbHome,
  onInstall,
  onViewAuthor,
  className,
  style,
}: RegistryPluginDetailSurfaceProps) {
  const isTier3 = tier === "unverified";
  const isTombstoned = !!tombstoneReason;
  const installLabel = isTombstoned
    ? RPD_INSTALL_ANYWAY_CTA
    : RPD_INSTALL_CTA;
  const installChrome: CSSProperties = isTombstoned
    ? {
        background: "var(--warn-soft)",
        borderColor: "var(--warn-border)",
        color: "var(--warn)",
      }
    : {
        background: "var(--accent)",
        borderColor: "var(--accent)",
        color: "var(--accent-ink)",
      };

  return (
    <section
      data-surface="registry-plugin-detail"
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
            {RPD_BREADCRUMB_REGISTRY}
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
          <TierBadge tier={tier} />
        </div>
        <button
          type="button"
          onClick={onInstall}
          data-action="install"
          data-tombstoned={isTombstoned}
          style={{
            marginLeft: "auto",
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            borderWidth: 1,
            borderStyle: "solid",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            ...installChrome,
          }}
        >
          {installLabel}
        </button>
      </header>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 24px 48px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {isTier3 ? (
            <div
              data-field="tier3-banner"
              role="note"
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-md)",
                background: "var(--warn-soft)",
                marginBottom: 22,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  color: "var(--warn)",
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
                  <path d="M12 3l9 16H3z" />
                  <path d="M12 9v4M12 16h.01" />
                </svg>
              </span>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.55,
                }}
              >
                {RPD_TIER3_DISCLOSURE}
              </div>
            </div>
          ) : null}

          {isTombstoned ? (
            <div
              data-field="tombstone-banner"
              role="note"
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-md)",
                background: "var(--warn-soft)",
                marginBottom: 22,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  color: "var(--warn)",
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
                  <path d="M12 3a6 6 0 0 0-6 6v8h12V9a6 6 0 0 0-6-6z" />
                  <path d="M4 21h16M9 13h6" />
                </svg>
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                    lineHeight: 1.55,
                    marginBottom: 4,
                  }}
                >
                  {RPD_TOMBSTONE_PREFIX}
                  <em>“{tombstoneReason}”</em>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
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
                    ‡
                  </span>
                  {RPD_TOMBSTONE_BADGE}
                </span>
              </div>
            </div>
          ) : null}

          <section style={{ marginBottom: 26 }} data-field="header">
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--r-md)",
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                }}
              >
                <PluginKindIcon kind={kind} size={22} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    data-field="plugin-name"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 24,
                      color: "var(--ink)",
                    }}
                  >
                    {name}
                  </span>
                  <span
                    data-field="plugin-version"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {version}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "5px 16px",
                    marginTop: 10,
                  }}
                >
                  {[
                    [RPD_LABEL_AUTHOR, author, "var(--font-mono)", "var(--ink-soft)"],
                    [RPD_LABEL_LICENSE, license, "var(--font-mono)", "var(--ink-mute)"],
                  ].map(([label, value, font, color]) => (
                    <span key={label} style={{ display: "contents" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-mute)",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: font as string,
                          fontSize: 12.5,
                          color: color as string,
                          wordBreak: "break-all",
                        }}
                      >
                        {value}
                      </span>
                    </span>
                  ))}
                  {homepage ? (
                    <>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-mute)",
                        }}
                      >
                        {RPD_LABEL_HOMEPAGE}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                        }}
                      >
                        <a
                          href={homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--network)",
                            textDecoration: "none",
                          }}
                        >
                          {homepage} →
                        </a>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 26 }} data-field="description">
            <h2 style={sectionH()}>{RPD_DESCRIPTION_HEADING}</h2>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                lineHeight: 1.65,
                color: "var(--ink-soft)",
              }}
            >
              {description}
            </div>
          </section>

          <section style={{ marginBottom: 26 }} data-field="capabilities">
            <h2 style={sectionH()}>{RPD_CAPABILITIES_HEADING}</h2>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 12px",
              }}
            >
              {RPD_CAPABILITIES_SUB}
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 9 }}
            >
              {capabilities.map((c) => (
                <CapabilityRow key={c.wireKey} {...c} />
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 26 }} data-field="ext-points">
            <h2 style={sectionH()}>{RPD_EXT_POINTS_HEADING}</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 7 }}
            >
              {extensionPoints.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "11px 14px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {e.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {e.detail}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{ marginBottom: 26 }}
            data-field="version-history"
          >
            <h2 style={sectionH()}>
              {RPD_VERSION_HISTORY_HEADING}
            </h2>
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
              {versions.map((v, i) => (
                <div
                  key={v.version}
                  data-version={v.version}
                  style={{
                    padding: "12px 15px",
                    borderBottomWidth:
                      i < versions.length - 1 ? 1 : 0,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                        color: "var(--ink)",
                      }}
                    >
                      {v.version}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {v.date}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                      lineHeight: 1.5,
                    }}
                  >
                    {v.notes}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={onViewAuthor}
            data-action="view-author"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="9" r="3" />
              <path d="M6 20a6 6 0 0 1 12 0" />
            </svg>
            {RPD_VIEW_AUTHOR_CTA}
          </button>
        </div>
      </div>
    </section>
  );
}

function sectionH(): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: 17,
    color: "var(--ink)",
    margin: "0 0 8px",
  };
}
