/**
 * RegistryPublicHome — H10 Cluster A1 surface.
 *
 * Public landing page at plugins.theourgia.com. NO VaultNav — this
 * is the registry's own host. The topbar reads `‡ plugins.theourgia.com`
 * (rule 7 citation chrome).
 *
 * Rules in play:
 *   - Rule 9: counts only on extension-point tiles (load-bearing for
 *     nav, not for ranking).
 *   - Rule 29: tier badges render neutral chrome.
 *   - Rule 38: never popularity-sorted.
 */

import type { CSSProperties } from "react";

import {
  type ExtensionPointTile,
  FOOTER_LINKS,
  FOR_AUTHORS_BODY,
  FOR_AUTHORS_CTA,
  type RecentlyAddedItem,
  type RecentlyUpdatedItem,
  SECTION_LABELS,
  TIER_BLOCKS,
  type TierKey,
} from "./copy.js";

export interface RegistryPublicHomeSurfaceProps {
  manifesto?: string;
  extensionPoints: readonly ExtensionPointTile[];
  recentlyUpdated: readonly RecentlyUpdatedItem[];
  recentlyAdded: readonly RecentlyAddedItem[];
  /** Where the "Submit a plugin" CTA goes — defaults to the local route. */
  submitHref?: string;
  /** The footer host label. Defaults to "plugins.theourgia.com". */
  hostLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "32px 28px 56px",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function tierMiniStyle(tier: TierKey): CSSProperties {
  const base: CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    padding: "0 7px",
    borderRadius: "var(--r-pill)",
  };
  if (tier === "official") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
    };
  }
  if (tier === "community") {
    return {
      ...base,
      color: "var(--network)",
      background: "var(--network-soft)",
    };
  }
  return {
    ...base,
    color: "var(--ink-mute)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--plugin-disabled-line, var(--line-2))",
  };
}

function tierChipStyle(tier: TierKey): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 11px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
  };
  if (tier === "official") {
    return {
      ...base,
      background: "var(--peer-ok-soft)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--peer-ok)",
      color: "var(--peer-ok)",
    };
  }
  if (tier === "community") {
    return {
      ...base,
      background: "var(--network-soft)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--network-line, var(--network))",
      color: "var(--network)",
    };
  }
  return {
    ...base,
    background: "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--plugin-disabled-line, var(--line-2))",
    color: "var(--ink-mute)",
  };
}

export function RegistryPublicHomeSurface({
  manifesto,
  extensionPoints,
  recentlyUpdated,
  recentlyAdded,
  submitHref = "/submit",
  hostLabel = "plugins.theourgia.com",
  className,
  style,
}: RegistryPublicHomeSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Header */}
      <header style={{ marginBottom: 40 }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            letterSpacing: "0.04em",
            color: "var(--ink-mute)",
            marginBottom: 8,
          }}
        >
          ‡ {hostLabel}
        </div>
        {manifesto ? (
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              lineHeight: 1.4,
              color: "var(--ink)",
              margin: 0,
              maxWidth: 720,
            }}
          >
            {manifesto}
          </p>
        ) : null}
      </header>

      {/* Trust tiers */}
      <section style={{ marginBottom: 50 }}>
        <div style={SECTION_LABEL}>{SECTION_LABELS.trustTiers}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
          }}
        >
          {TIER_BLOCKS.map((t) => (
            <div
              key={t.key}
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
                  gap: 9,
                  marginBottom: 11,
                }}
              >
                <span style={tierChipStyle(t.key)}>{t.name}</span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--ink-soft)",
                  margin: 0,
                }}
              >
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by extension point */}
      <section style={{ marginBottom: 50 }}>
        <div style={SECTION_LABEL}>
          {SECTION_LABELS.browseByExtensionPoint}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 11,
          }}
        >
          {extensionPoints.map((e) => (
            // Non-interactive tile — the per-category listing endpoint
            // hasn't shipped yet, so we don't render a link that leads
            // nowhere. When it does, this switches back to <a>.
            <div
              key={e.name}
              style={{
                display: "block",
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
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {e.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  {e.count}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  lineHeight: 1.45,
                }}
              >
                {e.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent · two columns */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
          marginBottom: 54,
        }}
      >
        <div>
          <div style={SECTION_LABEL}>{SECTION_LABELS.recentlyUpdated}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentlyUpdated.map((r, idx) => (
              <a
                key={`${r.name}-${idx}`}
                href={r.href ?? "#"}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "9px 0",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink)",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {r.version}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {r.when}
                </span>
              </a>
            ))}
          </div>
        </div>
        <div>
          <div style={SECTION_LABEL}>{SECTION_LABELS.recentlyAdded}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentlyAdded.map((r, idx) => (
              <a
                key={`${r.name}-${idx}`}
                href={r.href ?? "#"}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "9px 0",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--line)",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink)",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {r.name}
                </span>
                <span style={tierMiniStyle(r.tier)}>
                  {r.tier[0]!.toUpperCase() + r.tier.slice(1)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {r.when}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* For authors */}
      <section
        style={{
          padding: "24px 26px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--accent-soft)",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            color: "var(--ink)",
            marginBottom: 8,
          }}
        >
          {SECTION_LABELS.forAuthors}
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: "0 0 16px",
            maxWidth: 620,
          }}
        >
          {FOR_AUTHORS_BODY}
        </p>
        <a
          href={submitHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            textDecoration: "none",
          }}
        >
          {FOR_AUTHORS_CTA}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </section>

      <footer
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          paddingTop: 24,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-mute)",
        }}
      >
        {FOOTER_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            style={{
              color: "var(--ink-mute)",
              textDecoration: "none",
            }}
          >
            {l.label}
          </a>
        ))}
      </footer>
    </div>
  );
}
