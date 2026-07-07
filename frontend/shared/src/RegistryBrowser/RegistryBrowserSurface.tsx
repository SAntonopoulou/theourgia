/**
 * RegistryBrowserSurface — H09 Cluster A surface 7.
 *
 * Honesty rules wired:
 *
 *   * **Sort is alpha · recent-update · recently-added** ONLY
 *     (rule 38). No popularity, no "trending," no "featured."
 *   * **TierBadge is neutral** (rule 29). Official → peer-ok ·
 *     Community → network · Unverified → disabled-line.
 *   * Citation framing: `‡ from registry.theourgia.com` verbatim.
 *   * Empty state copy verbatim.
 */

import { type CSSProperties, useMemo, useState } from "react";

import { PluginKindIcon } from "../InstalledPlugins/PluginKindIcon.js";
import type { PluginKind } from "../InstalledPlugins/copy.js";
import {
  RB_BREADCRUMB_ROOT,
  RB_CITATION_GLYPH,
  RB_EMPTY_BODY,
  RB_EMPTY_TITLE,
  RB_REGISTRY_CITATION_INSTANCE,
  RB_REGISTRY_CITATION_PREFIX,
  RB_SORT_LABEL,
  RB_SORT_LABELS,
  RB_SUBHEAD,
  RB_TIER_LABELS,
  RB_TITLE,
  RB_VIEW_CTA,
  type RegistrySort,
  type RegistryTier,
} from "./copy.js";
import { TierBadge } from "./TierBadge.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface RegistryPluginCard {
  id: string;
  kind: PluginKind;
  name: string;
  version: string;
  tier: Exclude<RegistryTier, "all">;
  author: string;
  description: string;
  /** Lower = newer. Used by the recent-update sort. */
  updatedRank: number;
  /** Lower = newer. Used by the recently-added sort. */
  addedRank: number;
}

export interface RegistryBrowserSurfaceProps {
  cards: readonly RegistryPluginCard[];
  onBreadcrumbHome?: () => void;
  onView?: (cardId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function RegistryBrowserSurface({
  cards,
  onBreadcrumbHome,
  onView,
  className,
  style,
}: RegistryBrowserSurfaceProps) {
  const [tier, setTier] = useState<RegistryTier>("all");
  const [sort, setSort] = useState<RegistrySort>("alpha");

  const filtered = useMemo(() => {
    const base =
      tier === "all" ? cards : cards.filter((c) => c.tier === tier);
    const sorted = [...base];
    if (sort === "alpha") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "recent-update") {
      sorted.sort((a, b) => a.updatedRank - b.updatedRank);
    } else {
      sorted.sort((a, b) => a.addedRank - b.addedRank);
    }
    return sorted;
  }, [cards, tier, sort]);

  const countLabel = `${filtered.length} ${
    filtered.length === 1 ? "plugin" : "plugins"
  }`;

  return (
    <section
      data-surface="registry-browser"
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
            gap: 9,
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
            {RB_BREADCRUMB_ROOT}
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                lineHeight: 1.1,
              }}
            >
              {RB_TITLE}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              {RB_SUBHEAD}
            </div>
          </div>
        </div>
      </header>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "20px 24px 48px",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
              role="radiogroup"
              aria-label="Trust tier"
              data-field="tier-chips"
            >
              {(["all", "official", "community", "unverified"] as RegistryTier[]).map(
                (t) => {
                  const on = tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setTier(t)}
                      data-tier-chip={t}
                      data-on={on}
                      style={{
                        padding: "6px 13px",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: on
                          ? "var(--line-2)"
                          : "var(--line)",
                        background: on
                          ? "var(--accent-soft)"
                          : "var(--bg-2)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: on ? "var(--ink)" : "var(--ink-soft)",
                        cursor: "pointer",
                      }}
                    >
                      {RB_TIER_LABELS[t]}
                    </button>
                  );
                },
              )}
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {RB_SORT_LABEL}
              </span>
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.currentTarget.value as RegistrySort)
                }
                data-field="sort"
                style={{
                  padding: "7px 11px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                }}
              >
                {(
                  Object.keys(RB_SORT_LABELS) as RegistrySort[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {RB_SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            data-field="citation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 16,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                lineHeight: 1,
              }}
            >
              {RB_CITATION_GLYPH}
            </span>
            {RB_REGISTRY_CITATION_PREFIX}
            {RB_REGISTRY_CITATION_INSTANCE} · {countLabel}
          </div>

          {filtered.length === 0 ? (
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
                {RB_EMPTY_TITLE}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink-mute)",
                }}
              >
                {RB_EMPTY_BODY}
              </div>
            </div>
          ) : (
            <div
              data-field="card-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {filtered.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onView?.(card.id)}
                  data-card-id={card.id}
                  data-tier={card.tier}
                  style={{
                    display: "block",
                    padding: "15px 16px",
                    borderRadius: "var(--r-lg)",
                    background: "var(--bg-2)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      marginBottom: 11,
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
                        color: "var(--accent)",
                        background: "var(--accent-soft)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                      }}
                    >
                      <PluginKindIcon kind={card.kind} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        data-field="card-name"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 16,
                          color: "var(--ink)",
                          lineHeight: 1.2,
                        }}
                      >
                        {card.name}
                      </div>
                      <div
                        data-field="card-version"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                          marginTop: 2,
                        }}
                      >
                        {card.version}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 9 }}>
                    <TierBadge tier={card.tier} />
                  </div>
                  <div
                    data-field="card-author"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 8,
                    }}
                  >
                    {card.author}
                  </div>
                  <div
                    data-field="card-desc"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--ink-soft)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      marginBottom: 13,
                    }}
                  >
                    {card.description}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-ui)",
                      fontSize: 13,
                      color: "var(--accent)",
                    }}
                  >
                    {RB_VIEW_CTA}
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
