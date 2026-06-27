/**
 * AgentActivityLog — H10 Cluster C11 surface.
 *
 * Rule 55 — every row's summary is human-readable. The build side
 * generates these from MCP-call patterns; the surface never composes
 * them at render time (that would risk oracular framing).
 */

import type { CSSProperties } from "react";

import {
  type ActivityTimeRange,
  OUTCOME_OPTIONS,
  type OutcomeFilter,
  type RunOutcome,
  TIME_RANGE_OPTIONS,
  TRANSCRIPT_LABEL,
} from "./copy.js";

export interface ActivityRunRow {
  id: string;
  /** Display-friendly local time "27 Jun 11:48". */
  time: string;
  /** Human-readable summary (rule 55). */
  summary: string;
  outcome: RunOutcome;
  /** Token total like "7.5K". */
  tokensLabel: string;
  /** Href to the C8 transcript viewer. */
  transcriptHref?: string;
}

export interface AgentActivityLogSurfaceProps {
  rows: readonly ActivityRunRow[];
  timeRange?: ActivityTimeRange;
  outcome?: OutcomeFilter;
  onTimeRangeChange?: (next: ActivityTimeRange) => void;
  onOutcomeChange?: (next: OutcomeFilter) => void;
  onOpenTranscript?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "22px 24px 48px",
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

function outcomeChipStyle(o: RunOutcome): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    flex: "none",
  };
  if (o === "completed") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
    };
  }
  if (o === "errored") {
    return {
      ...base,
      color: "var(--warn)",
      background: "var(--warn-soft)",
    };
  }
  return {
    ...base,
    color: "var(--ink-mute)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
  };
}

export function AgentActivityLogSurface({
  rows,
  timeRange = "last_30_days",
  outcome = "all",
  onTimeRangeChange,
  onOutcomeChange,
  onOpenTranscript,
  className,
  style,
}: AgentActivityLogSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <select
          aria-label="Time range filter"
          value={timeRange}
          onChange={(e) =>
            onTimeRangeChange?.(e.target.value as ActivityTimeRange)
          }
          style={SELECT}
        >
          {TIME_RANGE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Outcome filter"
          value={outcome}
          onChange={(e) =>
            onOutcomeChange?.(e.target.value as OutcomeFilter)
          }
          style={SELECT}
        >
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: "16px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            No runs in this window.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              data-run={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  flex: "none",
                  width: 96,
                }}
              >
                {r.time}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                }}
                data-summary
              >
                {r.summary}
              </span>
              <span style={outcomeChipStyle(r.outcome)}>{r.outcome}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  flex: "none",
                }}
              >
                {r.tokensLabel}
              </span>
              <button
                type="button"
                onClick={() => onOpenTranscript?.(r.id)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--accent)",
                  flex: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {TRANSCRIPT_LABEL}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
