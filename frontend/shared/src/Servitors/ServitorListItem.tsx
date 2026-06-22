/**
 * ServitorListItem — sidebar tile for the Servitors surface.
 *
 * Per `Theourgia Servitors.dc.html`. Each tile shows a sigil slot
 * (caller renders the SVG), the servitor name, a kind label
 * ("Servitor" / "Egregore"), the status pill, and an optional
 * "feeding elapsed" hint footer. The footer's clock icon tints to
 * --warn when the feeding is overdue.
 *
 * Status semantics from `ServitorStatusPill`. The kind label is
 * surface-supplied since the kind taxonomy is small (2-3 values)
 * and the caller localises freely.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  SERVITOR_STATUS_META,
  type ServitorStatus,
} from "./ServitorStatusPill.js";

export interface ServitorListItemProps {
  id: string;
  name: string;
  /** "Servitor", "Egregore", or surface-localised label. */
  kindLabel: string;
  status: ServitorStatus;
  /** Slot for the sigil glyph (an SVG, a Unicode glyph, etc.). */
  sigil?: ReactNode;
  /** Free-text feeding hint ("Fed 6 days ago", "Group feeding elapsed"). */
  feedHint?: string;
  /** When true, the feeding-hint clock icon tints to --warn (overdue). */
  feedOverdue?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ServitorListItem({
  id,
  name,
  kindLabel,
  status,
  sigil,
  feedHint,
  feedOverdue = false,
  selected = false,
  onSelect,
  className,
  style,
}: ServitorListItemProps) {
  const statusMeta = SERVITOR_STATUS_META[status];
  const feedColor = feedOverdue ? "var(--warn)" : "var(--ink-mute)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="servitor-list-item"
      data-servitor-id={id}
      data-servitor-status={status}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "11px 13px",
        borderRadius: "var(--r-md, 8px)",
        background: selected ? "var(--bg-3)" : "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "var(--accent)" : "var(--line)",
        color: "var(--ink)",
        cursor: "pointer",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span
          aria-hidden="true"
          data-sigil
          style={{
            width: 34,
            height: 34,
            flex: "none",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            background: "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            fontFamily: "var(--font-glyph)",
            fontSize: 17,
          }}
        >
          {sigil}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15.5,
              lineHeight: 1.2,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {kindLabel}
          </div>
        </div>
        <span
          data-status-chip
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 8px",
            borderRadius: 999,
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-soft)",
            background: `color-mix(in srgb, ${statusMeta.color} 14%, transparent)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `color-mix(in srgb, ${statusMeta.color} 32%, transparent)`,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: statusMeta.color,
            }}
          />
          {statusMeta.label}
        </span>
      </div>
      {feedHint ? (
        <div
          data-feed-hint
          data-feed-overdue={feedOverdue ? "true" : "false"}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-soft)",
            marginTop: 8,
            paddingTop: 7,
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ClockIcon color={feedColor} />
          {feedHint}
        </div>
      ) : null}
    </button>
  );
}
