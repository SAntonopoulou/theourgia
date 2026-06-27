/**
 * PerUserAuditLog — H10 Cluster B4 surface.
 *
 * Rule 49 — human-readable action lines; raw payload (with substrate
 * UUIDs) lives behind a per-row "view raw" toggle.
 *
 * Rule 9 — quiet stats: outcome chips render in neutral chrome
 * (peer-ok-soft for success · warn-soft for denied · `--ink-mute`
 * border for failure).
 */

import { useState, type CSSProperties } from "react";

import {
  ACTOR_OPTIONS,
  type ActorFilter,
  KIND_OPTIONS,
  type KindFilter,
  type OutcomeKind,
  PREAMBLE,
  TIME_RANGE_OPTIONS,
  type TimeRange,
  ZONE_NOTE_PREFIX,
} from "./copy.js";

export interface AuditLogRow {
  id: string;
  /** Display-friendly local time like "27 Jun 14:02". */
  time: string;
  /** Human-readable action sentence (rule 49). */
  action: string;
  outcome: OutcomeKind;
  /** The raw payload string the user can reveal. */
  raw: string;
}

export interface PerUserAuditLogSurfaceProps {
  rows: readonly AuditLogRow[];
  /** User's local zone (e.g., "Europe/Athens"). Rendered in the
   *  filter row's right-aligned note. */
  localZone?: string;
  actor?: ActorFilter;
  kind?: KindFilter;
  timeRange?: TimeRange;
  onActorChange?: (next: ActorFilter) => void;
  onKindChange?: (next: KindFilter) => void;
  onTimeRangeChange?: (next: TimeRange) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: "24px 24px 48px",
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

function outcomeChipStyle(kind: OutcomeKind): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    flex: "none",
  };
  if (kind === "success") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
    };
  }
  if (kind === "denied") {
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

export function PerUserAuditLogSurface({
  rows,
  localZone,
  actor = "all",
  kind = "all",
  timeRange = "last_30_days",
  onActorChange,
  onKindChange,
  onTimeRangeChange,
  className,
  style,
}: PerUserAuditLogSurfaceProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
          margin: "0 0 18px",
          maxWidth: 640,
        }}
      >
        {PREAMBLE}
      </p>

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
          aria-label="Actor filter"
          value={actor}
          onChange={(e) => onActorChange?.(e.target.value as ActorFilter)}
          style={SELECT}
        >
          {ACTOR_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Event kind filter"
          value={kind}
          onChange={(e) => onKindChange?.(e.target.value as KindFilter)}
          style={SELECT}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Time range filter"
          value={timeRange}
          onChange={(e) =>
            onTimeRangeChange?.(e.target.value as TimeRange)
          }
          style={SELECT}
        >
          {TIME_RANGE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        {localZone ? (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {ZONE_NOTE_PREFIX} ({localZone})
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        {rows.map((r) => {
          const isOpen = !!openMap[r.id];
          return (
            <div
              key={r.id}
              data-row={r.id}
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: "12px 15px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    flex: "none",
                    width: 104,
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
                  }}
                >
                  {r.action}
                </span>
                <span style={outcomeChipStyle(r.outcome)}>
                  {r.outcome}
                </span>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`raw-${r.id}`}
                  onClick={() =>
                    setOpenMap((m) => ({ ...m, [r.id]: !m[r.id] }))
                  }
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    flex: "none",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {isOpen ? "hide raw" : "view raw"}
                </button>
              </div>
              {isOpen ? (
                <pre
                  id={`raw-${r.id}`}
                  style={{
                    margin: 0,
                    padding: "12px 15px",
                    borderTopWidth: 1,
                    borderTopStyle: "solid",
                    borderTopColor: "var(--line)",
                    background: "var(--bg-sunk)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "var(--ink-mute)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {r.raw}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
