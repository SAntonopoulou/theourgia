/**
 * AgentsHome — H10 Cluster C1 surface.
 *
 * The calm doorway. Rule 60 — no promotional chrome. The empty state
 * frames the agent layer as truly optional.
 *
 * Sub-nav (rule from agent_onboarding_H10): Agents · Marketplace ·
 * Memory · Cost · Settings.
 */

import type { CSSProperties, ReactNode } from "react";

import {
  type AgentKind,
  type AgentStatus,
  type AgentSubnavKey,
  BROWSE_MARKETPLACE_CTA,
  DISABLED_HINT,
  DISABLED_ROW_LABEL,
  EDITORIAL_INTRO,
  EMPTY_STATE,
  SECTION_LABELS,
  STATUS_LABEL,
  SUBNAV_ITEMS,
} from "./copy.js";

export interface AgentRow {
  id: string;
  name: string;
  kind: AgentKind;
  /** "2 hours ago" / "yesterday" / etc. Parent formats. */
  lastActive: string;
  status: AgentStatus;
}

export interface DisabledAgentRow {
  id: string;
  name: string;
  kind: AgentKind;
}

export interface AgentsHomeSurfaceProps {
  active: readonly AgentRow[];
  disabled: readonly DisabledAgentRow[];
  activeNav?: AgentSubnavKey;
  onOpen?: (id: string) => void;
  onBrowseMarketplace?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 12,
};

const NAV_ROW: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: "8px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

function navItemStyle(on: boolean): CSSProperties {
  return {
    padding: "7px 13px",
    borderRadius: "var(--r-md)",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: on ? "var(--ink)" : "var(--ink-mute)",
    background: on ? "var(--accent-soft)" : "transparent",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

function statusChipStyle(status: AgentStatus): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    flex: "none",
    borderWidth: 1,
    borderStyle: "solid",
  };
  if (status === "active") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
      borderColor: "var(--peer-ok)",
    };
  }
  if (status === "cost-capped") {
    return {
      ...base,
      color: "var(--warn)",
      background: "var(--warn-soft)",
      borderColor: "var(--warn-border)",
    };
  }
  return {
    ...base,
    color: "var(--ink-mute)",
    borderColor: "var(--plugin-disabled-line, var(--line-2))",
  };
}

function AgentKindIcon({ kind }: { kind: AgentKind }): ReactNode {
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
    case "archivist":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16M9 4v16" />
        </svg>
      );
  }
}

export function AgentsHomeSurface({
  active,
  disabled,
  activeNav = "agents",
  onOpen,
  onBrowseMarketplace,
  className,
  style,
}: AgentsHomeSurfaceProps) {
  return (
    <div className={className} style={style}>
      <nav aria-label="Agent sub-navigation" style={NAV_ROW}>
        {SUBNAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            data-subnav={item.key}
            style={navItemStyle(item.key === activeNav)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div style={PAGE}>
        {/* Editorial intro — rules 50-60 in plain prose */}
        <div
          style={{
            padding: "20px 22px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background: "var(--bg-2)",
            marginBottom: 30,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--ink-soft)",
              margin: 0,
            }}
          >
            {EDITORIAL_INTRO}
          </p>
        </div>

        {/* Active agents */}
        <div style={SECTION_LABEL}>{SECTION_LABELS.active}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {active.length === 0 ? (
            <div
              style={{
                padding: "20px 22px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {EMPTY_STATE.noActiveTitle}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink-soft)",
                  lineHeight: 1.55,
                }}
              >
                {EMPTY_STATE.noActiveBody}
              </div>
            </div>
          ) : (
            active.map((a) => (
              <button
                key={a.id}
                type="button"
                data-agent={a.id}
                onClick={() => onOpen?.(a.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: "15px 17px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
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
                  <AgentKindIcon kind={a.kind} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                    }}
                  >
                    {a.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      marginTop: 2,
                    }}
                  >
                    Last active {a.lastActive}
                  </div>
                </div>
                <span style={statusChipStyle(a.status)}>
                  {STATUS_LABEL[a.status]}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Installed but disabled */}
        {disabled.length > 0 ? (
          <>
            <div style={{ ...SECTION_LABEL, marginBottom: 6 }}>
              {SECTION_LABELS.installedDisabled}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginBottom: 12,
              }}
            >
              {DISABLED_HINT}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 30,
              }}
            >
              {disabled.map((a) => (
                <div
                  key={a.id}
                  data-agent={a.id}
                  data-disabled
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "15px 17px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--plugin-disabled-line, var(--line-2))",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
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
                      color: "var(--ink-mute)",
                      background: "var(--bg-3)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                    }}
                  >
                    <AgentKindIcon kind={a.kind} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                      }}
                    >
                      {DISABLED_ROW_LABEL}
                    </div>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "1px 10px",
                      borderRadius: "var(--r-pill)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor:
                        "var(--plugin-disabled-line, var(--line-2))",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    paused
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={onBrowseMarketplace}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 17px",
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
          {BROWSE_MARKETPLACE_CTA}
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
        </button>
      </div>
    </div>
  );
}
