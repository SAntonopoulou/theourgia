/**
 * PluginAuthorProfileSurface — H09 Cluster A surface 9.
 *
 * Honesty rule 37 — author profile is a citation, not a star
 * rating. The four stat tiles are Plugins · First-published ·
 * Last-activity · License. No follower count, no star count, no
 * downloads, no rating chrome anywhere.
 */

import { type CSSProperties, type ReactNode } from "react";

import { PluginKindIcon } from "../InstalledPlugins/PluginKindIcon.js";
import type { PluginKind } from "../InstalledPlugins/copy.js";
import { TierBadge } from "../RegistryBrowser/TierBadge.js";
import type { RegistryTier } from "../RegistryBrowser/copy.js";
import {
  PAP_ABOUT_HEADING,
  PAP_PLUGINS_HEADING,
  PAP_STAT_FIRST_PUBLISHED,
  PAP_STAT_LAST_ACTIVITY,
  PAP_STAT_LICENSE,
  PAP_STAT_PLUGINS,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface AuthorPluginCard {
  id: string;
  kind: PluginKind;
  name: string;
  version: string;
  description: string;
  tier: Exclude<RegistryTier, "all">;
}

export interface PluginAuthorProfileSurfaceProps {
  /** Author display name. */
  displayName: string;
  /** Single-glyph monogram for the avatar. */
  monogram: string;
  /** Full DID. */
  did: string;
  about: ReactNode;
  /** Optional homepage URL. */
  homepage?: string;
  pluginCount: number;
  firstPublishedLabel: string;
  lastActivityLabel: string;
  licenseLabel: string;
  plugins: readonly AuthorPluginCard[];
  onPluginClick?: (pluginId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function PluginAuthorProfileSurface({
  displayName,
  monogram,
  did,
  about,
  homepage,
  pluginCount,
  firstPublishedLabel,
  lastActivityLabel,
  licenseLabel,
  plugins,
  onPluginClick,
  className,
  style,
}: PluginAuthorProfileSurfaceProps) {
  return (
    <section
      data-surface="plugin-author-profile"
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
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
            data-field="topbar-did"
          >
            {did}
          </div>
        </div>
      </header>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "30px 24px 48px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Header */}
          <div
            data-field="header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: 26,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
              }}
            >
              {monogram}
            </span>
            <div>
              <div
                data-field="display-name"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  color: "var(--ink)",
                }}
              >
                {displayName}
              </div>
              <div
                data-field="did"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  marginTop: 3,
                }}
              >
                {did}
              </div>
            </div>
          </div>

          {/* About */}
          <section
            style={{ marginBottom: 24 }}
            data-field="about-section"
          >
            <h2 style={sectionH(16)}>{PAP_ABOUT_HEADING}</h2>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.65,
                color: "var(--ink-soft)",
                margin: "0 0 8px",
              }}
            >
              {about}
            </div>
            {homepage ? (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13 }}>
                <a
                  href={homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-field="homepage-link"
                  style={{
                    color: "var(--network)",
                    textDecoration: "none",
                  }}
                >
                  {homepage} →
                </a>
              </div>
            ) : null}
          </section>

          {/* Stat tiles (rule 37 — no social metrics) */}
          <div
            data-field="stat-tiles"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 11,
              marginBottom: 26,
            }}
          >
            <StatTile
              label={PAP_STAT_PLUGINS}
              value={String(pluginCount)}
              variant="display"
            />
            <StatTile
              label={PAP_STAT_FIRST_PUBLISHED}
              value={firstPublishedLabel}
              variant="serif"
            />
            <StatTile
              label={PAP_STAT_LAST_ACTIVITY}
              value={lastActivityLabel}
              variant="serif"
            />
            <StatTile
              label={PAP_STAT_LICENSE}
              value={licenseLabel}
              variant="mono"
            />
          </div>

          {/* Plugins grid */}
          <section data-field="plugins-section">
            <h2 style={sectionH(16)}>{PAP_PLUGINS_HEADING}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {plugins.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => onPluginClick?.(p.id)}
                  data-plugin-id={p.id}
                  style={{
                    display: "block",
                    padding: "14px 15px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-lg)",
                    background: "var(--bg-2)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 9,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
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
                      <PluginKindIcon kind={p.kind} size={17} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          color: "var(--ink)",
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {p.version}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <TierBadge tier={p.tier} />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "var(--ink-soft)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function sectionH(size: number): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: size,
    color: "var(--ink)",
    margin: "0 0 8px",
  };
}

function StatTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "display" | "serif" | "mono";
}) {
  const font =
    variant === "display"
      ? "var(--font-display)"
      : variant === "mono"
        ? "var(--font-mono)"
        : "var(--font-serif)";
  const size = variant === "display" ? 22 : variant === "mono" ? 13 : 15;
  return (
    <div
      data-stat-tile={label}
      style={{
        padding: "14px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{ fontFamily: font, fontSize: size, color: "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
