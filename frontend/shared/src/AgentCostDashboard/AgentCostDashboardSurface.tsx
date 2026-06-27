/**
 * AgentCostDashboard — H10 Cluster C10 surface.
 *
 * Rule 9 — quiet stats. Rule 58 — fresh/resume split is FIRST-CLASS;
 * not behind an expand toggle.
 *
 * Cap chip color follows the rule-56 proximity bands:
 *   <60%  → --peer-ok-soft
 *   60-85% → --line-2 outline
 *   >85%  → --warn-soft
 *   ≥100% → --warn (the "at cap" state)
 */

import type { CSSProperties, ReactNode } from "react";

import {
  ACROSS_ALL_AGENTS,
  type AgentRowKind,
  COL_LABELS,
  HEADERS,
  type TokenBreakdown,
} from "./copy.js";

export interface PerAgentRow {
  id: string;
  name: string;
  kind: AgentRowKind;
  /** Display-formatted cost like "$3.10". */
  costLabel: string;
  /** Display-formatted total like "820K". */
  tokensLabel: string;
  /** Display-formatted "180K / 640K" — fresh / resume. */
  freshResumeLabel: string;
  /** Display-formatted cap like "$10.00". */
  capLabel: string;
  /** Percentage of cap used: 0-100+ (100+ = at-cap state). */
  capUsedPct: number;
}

export interface AgentCostDashboardSurfaceProps {
  totalCostLabel: string;
  totalTokensLabel: string;
  totalTokenBreakdown: TokenBreakdown;
  perAgent: readonly PerAgentRow[];
  /** Optional 12-month chart as a ReactNode (parent supplies the SVG). */
  historyChart?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "24px 24px 48px",
};

function capChipStyle(pct: number): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 8px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
  };
  if (pct >= 100) {
    return {
      ...base,
      color: "#fff",
      background: "var(--warn)",
    };
  }
  if (pct > 85) {
    return {
      ...base,
      color: "var(--warn)",
      background: "var(--warn-soft)",
    };
  }
  if (pct > 60) {
    return {
      ...base,
      color: "var(--ink-mute)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--line-2)",
    };
  }
  return {
    ...base,
    color: "var(--peer-ok)",
    background: "var(--peer-ok-soft)",
  };
}

function KindIcon({ kind }: { kind: AgentRowKind }) {
  const common = {
    width: 16,
    height: 16,
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
    case "synchronicity":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3.2 3.2M14.3 14.3l3.2 3.2" />
        </svg>
      );
    case "study":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2z" />
          <path d="M13 3h5v16h-5" />
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

const TILE_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 6,
};

export function AgentCostDashboardSurface({
  totalCostLabel,
  totalTokensLabel,
  totalTokenBreakdown,
  perAgent,
  historyChart,
  className,
  style,
}: AgentCostDashboardSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {/* Vault totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 11,
          marginBottom: 26,
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
          }}
          data-tile="cost"
        >
          <div style={TILE_LABEL}>{HEADERS.monthCost}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              color: "var(--ink)",
            }}
          >
            {totalCostLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 4,
            }}
          >
            {ACROSS_ALL_AGENTS}
          </div>
        </div>
        <div
          style={{
            padding: "16px 18px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
          }}
          data-tile="tokens"
        >
          <div style={TILE_LABEL}>{HEADERS.monthTokens}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              color: "var(--ink)",
            }}
          >
            {totalTokensLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 4,
            }}
          >
            in {formatTokens(totalTokenBreakdown.in_)} · out{" "}
            {formatTokens(totalTokenBreakdown.out_)} · cache{" "}
            {formatTokens(totalTokenBreakdown.cache)}
          </div>
        </div>
      </div>

      {/* Per agent table */}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 12,
        }}
      >
        {HEADERS.perAgent}
      </div>
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 70px 90px 1.2fr 110px",
            gap: 14,
            padding: "10px 16px",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--line)",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          <span>{COL_LABELS.agent}</span>
          <span style={{ textAlign: "right" }}>{COL_LABELS.cost}</span>
          <span style={{ textAlign: "right" }}>{COL_LABELS.tokens}</span>
          <span>{COL_LABELS.freshResume}</span>
          <span style={{ textAlign: "right" }}>{COL_LABELS.cap}</span>
        </div>
        {perAgent.map((a, idx) => (
          <div
            key={a.id}
            data-agent={a.id}
            data-cap-pct={a.capUsedPct}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 70px 90px 1.2fr 110px",
              gap: 14,
              padding: "13px 16px",
              borderBottomWidth: idx < perAgent.length - 1 ? 1 : 0,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--line)",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "var(--r-sm)",
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
                <KindIcon kind={a.kind} />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.name}
              </span>
            </div>
            <span
              style={{
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {a.costLabel}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-soft)",
              }}
            >
              {a.tokensLabel}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
              data-fresh-resume
            >
              {a.freshResumeLabel}
            </span>
            <span
              style={{
                justifySelf: "end",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                {a.capLabel}
              </span>
              <span style={capChipStyle(a.capUsedPct)}>
                {a.capUsedPct}%
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* History chart */}
      {historyChart ? (
        <>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            {HEADERS.historyLabel}
          </div>
          <div
            style={{
              padding: "18px 18px 10px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            {historyChart}
          </div>
        </>
      ) : null}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}
