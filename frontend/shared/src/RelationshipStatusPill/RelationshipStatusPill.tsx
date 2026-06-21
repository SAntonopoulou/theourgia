/**
 * RelationshipStatusPill — six-state pill for the practitioner's
 * declared relationship with an entity.
 *
 * Per `Theourgia Entities.dc.html`: active / open / contracted /
 * observing / dormant / severed. Severed uses the care palette
 * (--st-severed neutral grey) rather than red — "the working is
 * closed" is information, not failure.
 */

import type { CSSProperties } from "react";

import type { EntityRelationshipStatus } from "../api/types.js";

interface StatusMeta {
  label: string;
  color: string;
}

export const RELATIONSHIP_STATUS_META: Record<
  EntityRelationshipStatus,
  StatusMeta
> = {
  active: { label: "Active", color: "var(--st-active)" },
  open: { label: "Open", color: "var(--st-open)" },
  contracted: { label: "Contracted", color: "var(--st-contracted)" },
  observing: { label: "Observing", color: "var(--st-observing)" },
  dormant: { label: "Dormant", color: "var(--st-dormant)" },
  severed: { label: "Severed", color: "var(--st-severed)" },
};

export interface RelationshipStatusPillProps {
  status: EntityRelationshipStatus;
  /** Override the visible label. Defaults to the canonical label. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function RelationshipStatusPill({
  status,
  label,
  className,
  style,
}: RelationshipStatusPillProps) {
  const meta = RELATIONSHIP_STATUS_META[status];
  const visibleLabel = label ?? meta.label;

  const composed: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 9px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    color: "var(--ink-soft)",
    background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${meta.color} 34%, transparent)`,
    ...style,
  };

  return (
    <span
      className={className}
      style={composed}
      data-relationship-status={status}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: meta.color,
          flex: "none",
        }}
      />
      {visibleLabel}
    </span>
  );
}
