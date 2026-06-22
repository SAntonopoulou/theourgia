/**
 * InitiationListItem — sidebar item for the Initiations surface.
 *
 * Per `Theourgia Initiations.dc.html`. The sidebar is intentionally
 * sparse: only the *tradition* and the *status* are stored in
 * plaintext per the H03 default-sealed rule. The lock glyph stands
 * in for the sealed contents (everything else encrypted).
 *
 * Optional "disclosed" footer shows when the initiation has been
 * attested — composes the Signing roster from B54 on the detail view.
 */

import { type CSSProperties } from "react";

import {
  INITIATION_STATUS_META,
  type InitiationStatus,
} from "./InitiationStatusPill.js";

export interface InitiationListItemProps {
  id: string;
  /** Plaintext tradition name. */
  tradition: string;
  status: InitiationStatus;
  /** Optional "Disclosed via attestation N June 2026" line. */
  disclosed?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

function LockGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export function InitiationListItem({
  id,
  tradition,
  status,
  disclosed,
  selected = false,
  onSelect,
  className,
  style,
}: InitiationListItemProps) {
  const statusMeta = INITIATION_STATUS_META[status];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="initiation-list-item"
      data-initiation-id={id}
      data-initiation-status={status}
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
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            flex: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--seal)",
            background: "var(--seal-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--seal-border)",
          }}
        >
          <LockGlyph />
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
            {tradition}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            Sealed
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
      {disclosed ? (
        <div
          data-disclosed
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            marginTop: 8,
            paddingTop: 7,
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CheckIcon />
          {disclosed}
        </div>
      ) : null}
    </button>
  );
}
