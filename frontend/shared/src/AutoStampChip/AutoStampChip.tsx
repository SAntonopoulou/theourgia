/**
 * AutoStampChip — small expandable chip surfacing the Phase-03
 * auto-stamp (astro + calendar context) recorded at write time.
 *
 * Used by Offerings, Synchronicities, the editor's `<calendar-stamp>`
 * block — anywhere a row carries `astro_snapshot` + `calendar_snapshot`
 * from the auto-stamping pipeline. Per S3.4: small chip; expand to
 * reveal the full string; NOT a wall of data.
 *
 * Form: a single chip ("Sun ☉ Gemini · dark moon · 24 Sivan 5786");
 * truncates with ellipsis when narrow; on click toggles to a full
 * card showing astro + calendar lines stacked.
 */

import { type CSSProperties, useState } from "react";

export interface AutoStampChipProps {
  /** Free-text astro snapshot, e.g. "Sun ☉ Gemini · dark moon · hour of Saturn" */
  astro?: string;
  /** Free-text calendar snapshot, e.g. "24 Sivan 5786" */
  calendar?: string;
  /**
   * Optional initial-collapsed copy override. Defaults to
   * `astro + ' · ' + calendar` (joined with middot when both present).
   */
  collapsedLabel?: string;
  className?: string;
  style?: CSSProperties;
}

function buildLabel(astro?: string, calendar?: string): string | null {
  const parts = [astro, calendar].filter((p): p is string => Boolean(p));
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function AutoStampChip({
  astro,
  calendar,
  collapsedLabel,
  className,
  style,
}: AutoStampChipProps) {
  const [expanded, setExpanded] = useState(false);
  const label = collapsedLabel ?? buildLabel(astro, calendar);

  if (!label) {
    return null;
  }

  const collapsedStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    color: "var(--ink-mute)",
    background: "var(--bg-sunk)",
    border: "1px solid var(--line)",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    ...style,
  };

  const expandedStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: "var(--r-md)",
    background: "var(--bg-sunk)",
    border: "1px solid var(--line)",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: "var(--ink-soft)",
    ...style,
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={className}
        style={collapsedStyle}
        title={label}
        aria-expanded="false"
        aria-label={`Auto-stamp: ${label}. Expand for detail.`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
        {label}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={expandedStyle}
      aria-expanded="true"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Auto-stamp
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Collapse auto-stamp"
          style={{
            padding: "2px 8px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            cursor: "pointer",
          }}
        >
          Collapse
        </button>
      </div>
      {astro ? (
        <div data-stamp="astro" style={{ color: "var(--ink)" }}>
          <span style={{ color: "var(--ink-mute)", marginRight: 6 }}>Astro</span>
          {astro}
        </div>
      ) : null}
      {calendar ? (
        <div data-stamp="calendar" style={{ color: "var(--ink)" }}>
          <span style={{ color: "var(--ink-mute)", marginRight: 6 }}>
            Calendar
          </span>
          {calendar}
        </div>
      ) : null}
    </div>
  );
}
