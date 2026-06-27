/**
 * RegistryReviewQueue — H10 Cluster A5 surface.
 *
 * Maintainer-facing dashboard of pending submissions. Rule 38 — FIFO
 * sort, no popularity. The parent supplies the filtered rows already
 * sorted oldest-first; this surface just renders.
 */

import type { CSSProperties } from "react";

import {
  countLabel,
  FIFO_NOTE,
  START_REVIEW_LABEL,
  type TargetTier,
  type TargetTierFilter,
  TARGET_TIER_OPTIONS,
  type TimeRangeFilter,
  TIME_RANGE_OPTIONS,
} from "./copy.js";

export interface ReviewQueueRow {
  id: string;
  name: string;
  /** Display-friendly version like "v2.2.0". */
  version: string;
  /** Author handle (e.g., "@agrippa-tools"). */
  authorHandle: string;
  /** "today" / "3 days ago". */
  submittedAt: string;
  targetTier: TargetTier;
  capabilityCount: number;
  /** Whether the parser accepted the manifest. */
  manifestParses: boolean;
}

export interface ExtensionPointFilterOption {
  key: string;
  label: string;
}

export interface RegistryReviewQueueSurfaceProps {
  rows: readonly ReviewQueueRow[];
  targetTier?: TargetTierFilter;
  extensionPoint?: string;
  extensionPointOptions?: readonly ExtensionPointFilterOption[];
  timeRange?: TimeRangeFilter;
  onTargetTierChange?: (next: TargetTierFilter) => void;
  onExtensionPointChange?: (next: string) => void;
  onTimeRangeChange?: (next: TimeRangeFilter) => void;
  onStartReview?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 820,
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

function tierChipStyle(t: TargetTier): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    borderWidth: 1,
    borderStyle: "solid",
  };
  if (t === "official") {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
      borderColor: "var(--peer-ok-border)",
    };
  }
  return {
    ...base,
    color: "var(--network)",
    background: "var(--network-soft)",
    borderColor: "var(--network-line, var(--network))",
  };
}

function parseChipStyle(ok: boolean): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 9px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
  };
  if (ok) {
    return {
      ...base,
      color: "var(--peer-ok)",
      background: "var(--peer-ok-soft)",
    };
  }
  return {
    ...base,
    color: "var(--warn)",
    background: "var(--warn-soft)",
  };
}

export function RegistryReviewQueueSurface({
  rows,
  targetTier = "all",
  extensionPoint = "all",
  extensionPointOptions = [{ key: "all", label: "All extension points" }],
  timeRange = "any",
  onTargetTierChange,
  onExtensionPointChange,
  onTimeRangeChange,
  onStartReview,
  className,
  style,
}: RegistryReviewQueueSurfaceProps) {
  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <select
          aria-label="Target tier filter"
          value={targetTier}
          onChange={(e) =>
            onTargetTierChange?.(e.target.value as TargetTierFilter)
          }
          style={SELECT}
        >
          {TARGET_TIER_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Extension point filter"
          value={extensionPoint}
          onChange={(e) => onExtensionPointChange?.(e.target.value)}
          style={SELECT}
        >
          {extensionPointOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Time range filter"
          value={timeRange}
          onChange={(e) =>
            onTimeRangeChange?.(e.target.value as TimeRangeFilter)
          }
          style={SELECT}
        >
          {TIME_RANGE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          {FIFO_NOTE}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 14,
        }}
      >
        {countLabel(rows.length)}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: "20px 22px",
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
            No pending submissions. Queue is clear.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              data-row={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 17px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
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
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.version}
                  </span>
                  <span style={tierChipStyle(r.targetTier)}>
                    →{" "}
                    {r.targetTier === "official"
                      ? "Official"
                      : "Community"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginTop: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.authorHandle}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.submittedAt}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.capabilityCount} capabilities
                  </span>
                  <span style={parseChipStyle(r.manifestParses)}>
                    {r.manifestParses ? "manifest parses" : "manifest error"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onStartReview?.(r.id)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent-soft)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--accent)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--accent)",
                  flex: "none",
                  cursor: "pointer",
                }}
              >
                {START_REVIEW_LABEL}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
