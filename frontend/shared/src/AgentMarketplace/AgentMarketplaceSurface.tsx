/**
 * AgentMarketplace — H10 Cluster C2 surface.
 *
 * Rule 38 — sort: alpha + recently-added. NEVER popularity.
 * Rule 29 — tier chips render in neutral chrome.
 */

import type { CSSProperties, ReactNode } from "react";

import {
  type AgentMarketKind,
  type AgentTier,
  type CapabilityFilter,
  CAPABILITY_OPTIONS,
  type SortOption,
  SORT_OPTIONS,
  type SourceFilter,
  SOURCE_OPTIONS,
  TIER_LABEL,
  VIEW_DETAIL_LABEL,
} from "./copy.js";

export interface MarketAgentCard {
  id: string;
  name: string;
  kind: AgentMarketKind;
  tier: AgentTier;
  description: string;
  /** "5 capabilities, read-only" / etc. Pre-formatted by the parent. */
  capabilityLabel: string;
}

export interface AgentMarketplaceSurfaceProps {
  cards: readonly MarketAgentCard[];
  source?: SourceFilter;
  capability?: CapabilityFilter;
  sort?: SortOption;
  onSourceChange?: (next: SourceFilter) => void;
  onCapabilityChange?: (next: CapabilityFilter) => void;
  onSortChange?: (next: SortOption) => void;
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "20px 24px 48px",
};

const SELECT: CSSProperties = {
  padding: "7px 11px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
};

function tierChipStyle(t: AgentTier): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    borderWidth: 1,
    borderStyle: "solid",
  };
  if (t === "official") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
      borderColor: "var(--peer-ok)",
    };
  }
  if (t === "community") {
    return {
      ...base,
      color: "var(--network)",
      background: "var(--network-soft)",
      borderColor: "var(--network-line, var(--network))",
    };
  }
  return {
    ...base,
    color: "var(--ink-mute)",
    borderColor: "var(--plugin-disabled-line, var(--line-2))",
  };
}

function KindIcon({ kind }: { kind: AgentMarketKind }): ReactNode {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "divination":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "study":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2z" />
          <path d="M13 3h5v16h-5" />
        </svg>
      );
    case "synchronicity":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3.2 3.2M14.3 14.3l3.2 3.2" />
        </svg>
      );
    case "correspondence":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5h16M4 5v14h16V5M9 5v14M4 12h5" />
        </svg>
      );
    case "ritual":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "archivist":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16M9 4v16" />
        </svg>
      );
  }
}

export function AgentMarketplaceSurface({
  cards,
  source = "all",
  capability = "all",
  sort = "alpha",
  onSourceChange,
  onCapabilityChange,
  onSortChange,
  onOpen,
  className,
  style,
}: AgentMarketplaceSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <select
          aria-label="Source filter"
          value={source}
          onChange={(e) =>
            onSourceChange?.(e.target.value as SourceFilter)
          }
          style={SELECT}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Capability filter"
          value={capability}
          onChange={(e) =>
            onCapabilityChange?.(e.target.value as CapabilityFilter)
          }
          style={SELECT}
        >
          {CAPABILITY_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          Sort
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) =>
              onSortChange?.(e.target.value as SortOption)
            }
            style={SELECT}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {cards.length === 0 ? (
          <div
            style={{
              padding: "24px 22px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
              gridColumn: "1 / -1",
            }}
          >
            The agent layer is plugin-driven; once you install agent plugins,
            they'll appear here.
          </div>
        ) : (
          cards.map((c) => (
            <button
              key={c.id}
              type="button"
              data-agent={c.id}
              onClick={() => onOpen?.(c.id)}
              style={{
                display: "block",
                padding: "16px 17px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--bg-2)",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                width: "100%",
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
                  <KindIcon kind={c.kind} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <span style={tierChipStyle(c.tier)}>
                      {TIER_LABEL[c.tier]}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--ink-soft)",
                  marginBottom: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {c.description}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {c.capabilityLabel}
                </span>
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
                  {VIEW_DETAIL_LABEL}
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
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
