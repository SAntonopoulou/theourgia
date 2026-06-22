/**
 * AttestationListItem — sidebar row in the Attestations surface.
 *
 * One row per attestation in the left rail (Theourgia Attestations.dc.html
 * lines 109–123). Composition:
 *
 *   [ kind badge ]  KIND LABEL                       [ Revoked pill ]
 *   Subject (display 16.5px)
 *   One-line description (ui 12px, ink-soft)
 *   [pen] N    Visibility label                            Granted ⌗
 *
 * Revoked rows render at opacity 0.78 with a "Revoked" pill in --revoke.
 * Selected rows paint bg-3.
 */

import { type CSSProperties } from "react";

import { AttestationKindBadge } from "./AttestationKindBadge.js";
import {
  ATTESTATION_KIND_META,
  type AttestationKind,
} from "./attestations.js";

export interface AttestationListItemProps {
  id: string;
  subject: string;
  description: string;
  kind: AttestationKind;
  /** Number of signatures (revocation rows are typically excluded). */
  signatureCount: number;
  /** Plain visibility label ("Private", "Viewer", "Network", "Public"). */
  visibilityLabel: string;
  /** Formatted granted-at — "20 March 2020" — to render right-aligned. */
  grantedLabel: string;
  revoked?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PEN_ICON = (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 19l1-3 9-9 2 2-9 9z" />
    <path d="M14 8l2 2" />
  </svg>
);

export function AttestationListItem({
  id,
  subject,
  description,
  kind,
  signatureCount,
  visibilityLabel,
  grantedLabel,
  revoked = false,
  selected = false,
  onSelect,
  className,
  style,
}: AttestationListItemProps) {
  const meta = ATTESTATION_KIND_META[kind];

  return (
    <button
      type="button"
      className={className}
      data-component="attestation-list-item"
      data-attestation-id={id}
      data-attestation-kind={kind}
      data-selected={selected ? "true" : "false"}
      data-revoked={revoked ? "true" : "false"}
      aria-pressed={selected}
      onClick={onSelect ? () => onSelect(id) : undefined}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderTop: "none",
        borderRight: "none",
        borderLeft: "none",
        borderBottom: "1px solid var(--line)",
        background: selected ? "var(--bg-3)" : "transparent",
        opacity: revoked ? 0.78 : 1,
        cursor: onSelect ? "pointer" : "default",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 5,
        }}
      >
        <AttestationKindBadge kind={kind} size={24} />
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {meta.label}
        </span>
        {revoked ? (
          <span
            data-revoked-pill
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--revoke)",
              padding: "1px 7px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: 999,
              background: "var(--revoke-soft)",
            }}
          >
            Revoked
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16.5,
          lineHeight: 1.2,
          color: "var(--ink)",
        }}
      >
        {subject}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-soft)",
          margin: "3px 0 8px",
          lineHeight: 1.4,
        }}
      >
        {description}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          data-signature-count
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {PEN_ICON}
          {signatureCount}
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {visibilityLabel}
        </span>
        <span
          data-granted-label
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {grantedLabel}
        </span>
      </div>
    </button>
  );
}
