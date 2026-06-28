/**
 * AgentInstall — H10 Cluster C3 surface · THE worked example.
 *
 * Composition order (rules verbatim):
 *
 *   1. Editorial preamble (what the agent does · rule 54 tone).
 *   2. Hard exclusions FIRST — sealed + closed-tradition (rules 52 + 53).
 *   3. Capabilities (scroll-gated · reuses H09 useScrollGate primitive).
 *   4. Memory directory path (verbatim `--font-mono`).
 *   5. Monthly cost cap (HARD · rule 56 line below input).
 *   6. BYO-key warning band when no key is configured (rule 57).
 *
 * Install button gated on (scrolledThroughCaps && costCap > 0).
 * When no key is configured, install completes but the agent stays
 * inactive (label flips to "Install (stays inactive)").
 */

import { useState, type CSSProperties } from "react";

import { useScrollGate } from "../PluginCapabilityReview/ScrollGate.js";

import {
  type AgentCapabilityChip,
  BUTTONS,
  GATE_NOTES,
  MEMORY_DIR_HINT,
  RULE_52_LINE,
  RULE_53_LINE,
  RULE_56_LINE,
  SECTION_LABELS,
} from "./copy.js";

export interface AgentInstallSurfaceProps {
  /** Editorial preamble — rendered verbatim above the exclusions. */
  preamble: string;
  capabilities: readonly AgentCapabilityChip[];
  /** Memory-dir path (rule 59 — exposed verbatim). */
  memoryDirPath: string;
  /** Whether the user has a BYO API key configured (rule 57). */
  hasKey?: boolean;
  /** Initial cap value as a string (the input is text so users can
   *  type partial values without losing focus on key-up). */
  initialCostCap?: string;
  /** Optional href for the "configure your key" link in the no-key
   *  banner. Defaults to /agents/settings/keys. */
  configureKeyHref?: string;
  onCancel?: () => void;
  onInstall?: (payload: {
    costCapMonthly: number;
    installInactive: boolean;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

const SCROLL_REGION: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "26px 24px 30px",
  flex: 1,
};

const PAGE: CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 11,
};

function ExclusionsIcon({ which }: { which: "sealed" | "closed" }) {
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
  if (which === "sealed") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

export function AgentInstallSurface({
  preamble,
  capabilities,
  memoryDirPath,
  hasKey = false,
  initialCostCap = "10.00",
  configureKeyHref = "/agents/settings/keys",
  onCancel,
  onInstall,
  className,
  style,
}: AgentInstallSurfaceProps) {
  const [costCap, setCostCap] = useState(initialCostCap);
  const { open: scrolledThroughCaps, containerProps } = useScrollGate();

  const numericCap = parseFloat(costCap);
  const costCapOk = Number.isFinite(numericCap) && numericCap > 0;
  const canInstall = scrolledThroughCaps && costCapOk;

  const gateNote = !scrolledThroughCaps
    ? GATE_NOTES.scrollFirst
    : !costCapOk
      ? GATE_NOTES.capRequired
      : GATE_NOTES.reviewed;

  const installLabel = hasKey ? BUTTONS.install : BUTTONS.installInactive;
  const noKey = !hasKey;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        ...style,
      }}
    >
      <div className="scroll" style={SCROLL_REGION} {...containerProps}>
        <div style={PAGE}>
          {/* Editorial preamble */}
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.65,
              color: "var(--ink-soft)",
              margin: "0 0 24px",
            }}
          >
            {preamble}
          </p>

          {/* Hard exclusions FIRST (rules 52 + 53) */}
          <div style={SECTION_LABEL}>{SECTION_LABELS.exclusions}</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              marginBottom: 26,
            }}
          >
            <div
              data-exclusion="sealed"
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--seal-border)",
                borderRadius: "var(--r-md)",
                background: "var(--seal-soft)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  color: "var(--seal)",
                  flex: "none",
                  marginTop: 1,
                }}
              >
                <ExclusionsIcon which="sealed" />
              </span>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.55,
                }}
              >
                {RULE_53_LINE}
              </div>
            </div>
            <div
              data-exclusion="closed-tradition"
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--seal-border)",
                borderRadius: "var(--r-md)",
                background: "var(--seal-soft)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  color: "var(--seal)",
                  flex: "none",
                  marginTop: 1,
                }}
              >
                <ExclusionsIcon which="closed" />
              </span>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.55,
                }}
              >
                {RULE_52_LINE}
              </div>
            </div>
          </div>

          {/* Capabilities (scroll-gated) */}
          <div style={SECTION_LABEL}>{SECTION_LABELS.capabilities}</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              marginBottom: 26,
            }}
          >
            {capabilities.map((c) => (
              <div
                key={c.wireKey + c.label}
                data-cap={c.wireKey}
                style={{
                  padding: "13px 15px",
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
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--network)",
                      padding: "1px 7px",
                      borderRadius: "var(--r-sm)",
                      background: "var(--network-soft)",
                    }}
                  >
                    {c.wireKey}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                    lineHeight: 1.5,
                  }}
                >
                  {c.note}
                </div>
              </div>
            ))}
          </div>

          {/* Memory dir */}
          <div style={SECTION_LABEL}>{SECTION_LABELS.memoryDir}</div>
          <div
            style={{
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                wordBreak: "break-all",
              }}
              data-memory-path
            >
              {memoryDirPath}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginTop: 6,
              }}
            >
              {MEMORY_DIR_HINT}
            </div>
          </div>

          {/* Cost cap */}
          <div style={SECTION_LABEL}>{SECTION_LABELS.costCap}</div>
          <div
            style={{
              padding: "15px 17px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--ink-mute)",
                }}
              >
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Monthly cost cap (USD)"
                value={costCap}
                onChange={(e) => setCostCap(e.target.value)}
                placeholder="10.00"
                style={{
                  width: 120,
                  padding: "9px 12px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 15,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              {RULE_56_LINE}
            </div>
          </div>

          {/* BYO-key warning */}
          {noKey ? (
            <div
              role="alert"
              data-no-key
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-md)",
                background: "var(--warn-soft)",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  display: "flex",
                  color: "var(--warn)",
                  flex: "none",
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="14" r="4" />
                  <path d="M11 11l8-8M16 5l2 2" />
                </svg>
              </span>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.55,
                }}
              >
                An API key is required before this agent can run. You can
                install now — the agent stays inactive — and{" "}
                <a
                  href={configureKeyHref}
                  style={{
                    color: "var(--warn)",
                    textDecoration: "underline",
                  }}
                >
                  configure your key
                </a>{" "}
                afterward.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer with Install gate */}
      <div
        style={{
          padding: "14px 24px",
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
          background: "var(--bg)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 620,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginRight: "auto",
            }}
            data-gate-note
          >
            {gateNote}
          </span>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "11px 17px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {BUTTONS.cancel}
          </button>
          <button
            type="button"
            disabled={!canInstall}
            onClick={() =>
              onInstall?.({
                costCapMonthly: numericCap,
                installInactive: noKey,
              })
            }
            style={{
              padding: "11px 22px",
              borderRadius: "var(--r-md)",
              background: canInstall ? "var(--accent)" : "var(--bg-3)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: canInstall ? "var(--accent)" : "var(--line)",
              color: canInstall ? "var(--accent-ink)" : "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              cursor: canInstall ? "pointer" : "not-allowed",
            }}
          >
            {installLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
