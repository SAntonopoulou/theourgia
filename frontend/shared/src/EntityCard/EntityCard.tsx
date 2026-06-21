/**
 * EntityCard — catalog card for a magical being.
 *
 * Per `Theourgia Entities.dc.html`. Renders the kind-group-colored
 * avatar (with a distinct portrait/glyph slot), name + federation
 * unread dot, kind line, RelationshipStatusPill, tradition badge,
 * one-paragraph summary, optional "next due" hint, optional
 * saved-view tags, and three quick actions (Offer / Work / Aggregate).
 *
 * Severed entities are dimmed and switch their avatar to the neutral
 * care palette per the design.
 */

import { type CSSProperties, type ReactNode } from "react";

import type { EntityKind, EntityRelationshipStatus } from "../api/types.js";
import {
  type EntityFunctionGroup,
  FUNCTION_GROUPS,
} from "../KindFunctionFilter/KindFunctionFilter.js";
import { RelationshipStatusPill } from "../RelationshipStatusPill/RelationshipStatusPill.js";

export interface EntitySummary {
  id: string;
  name: string;
  kind: EntityKind;
  tradition: string;
  status: EntityRelationshipStatus;
  summary?: string;
  /** Free-text relative date — "Deipnon · in 2 days". */
  due?: string;
  /** Saved-view chip labels to show under the kind line. */
  views?: string[];
  /** Federation freshness indicator. */
  unread?: boolean;
}

export interface EntityCardProps {
  entity: EntitySummary;
  /** Override the avatar with a portrait/sigil; defaults to glyph. */
  avatar?: ReactNode;
  /** Severed entities are dimmed; pass `true` to force a selected state. */
  selected?: boolean;
  onToggleSelect?: (next: boolean) => void;
  onOffer?: () => void;
  onWork?: () => void;
  onAggregate?: () => void;
  className?: string;
  style?: CSSProperties;
}

function groupFor(kind: EntityKind):
  | { key: EntityFunctionGroup; label: string; color: string }
  | undefined {
  const found = (
    Object.keys(FUNCTION_GROUPS) as EntityFunctionGroup[]
  ).find((key) => FUNCTION_GROUPS[key].kinds.includes(kind));
  if (!found) return undefined;
  const meta = FUNCTION_GROUPS[found];
  return { key: found, label: meta.label, color: meta.color };
}

const KIND_LABEL: Record<EntityKind, string> = {
  deity: "Deity",
  god: "God",
  goddess: "Goddess",
  saint: "Saint",
  angel: "Angel",
  daemon: "Daemon",
  demon: "Demon",
  spirit: "Spirit",
  ancestor: "Ancestor",
  beloved_dead: "Beloved dead",
  familiar: "Familiar",
  servitor: "Servitor",
  egregore: "Egregore",
  place: "Place",
  object: "Object",
  principle: "Principle",
  other: "Other",
};

const traditionBadge: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  color: "var(--ink-mute)",
  padding: "2px 8px",
  border: "1px solid var(--line)",
  borderRadius: 999,
};

const actionBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 9px",
  borderRadius: 7,
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
  flex: 1,
  justifyContent: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

function Initial({ name }: { name: string }) {
  const ch = name.trim().charAt(0).toUpperCase();
  return <span aria-hidden="true">{ch}</span>;
}

function OfferIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10.5h14l-1.4 6.4a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6z" />
      <path d="M9 10.5V8M12 10.5V6.5M15 10.5V8" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
    </svg>
  );
}

function AggregateIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7.5" r="2.6" />
      <circle cx="17" cy="16.5" r="2.6" />
      <path d="M9 9.5l6 5" />
    </svg>
  );
}

function DueIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function EntityCard({
  entity,
  avatar,
  selected = false,
  onToggleSelect,
  onOffer,
  onWork,
  onAggregate,
  className,
  style,
}: EntityCardProps) {
  const group = groupFor(entity.kind);
  const sev = entity.status === "severed";
  const groupColor = group?.color ?? "var(--accent)";

  const avatarStyle: CSSProperties = {
    width: 46,
    height: 46,
    flex: "none",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: 18,
    color: sev ? "var(--ink-mute)" : groupColor,
    background: sev
      ? "var(--bg-3)"
      : `color-mix(in srgb, ${groupColor} 14%, transparent)`,
    border: `1px solid ${sev ? "var(--line)" : `color-mix(in srgb, ${groupColor} 40%, transparent)`}`,
    opacity: sev ? 0.7 : 1,
  };

  const cardStyle: CSSProperties = {
    position: "relative",
    border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "var(--r-lg)",
    background: "var(--bg-2)",
    padding: "15px 16px",
    opacity: sev ? 0.82 : 1,
    display: "flex",
    flexDirection: "column",
    ...style,
  };

  return (
    <div
      className={className}
      data-entity-id={entity.id}
      data-relationship-status={entity.status}
      data-function-group={group?.key}
      data-selected={selected ? "true" : "false"}
      style={cardStyle}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {onToggleSelect ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={(selected ? "Deselect " : "Select ") + entity.name}
            onClick={() => onToggleSelect(!selected)}
            style={{
              width: 22,
              height: 22,
              flex: "none",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${selected ? "var(--accent)" : "var(--line-2)"}`,
              background: selected ? "var(--accent)" : "transparent",
              marginTop: 2,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {selected ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-ink)"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12l4 4 10-10" />
              </svg>
            ) : null}
          </button>
        ) : null}

        <span style={avatarStyle}>
          {avatar ?? <Initial name={entity.name} />}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17.5,
                lineHeight: 1.15,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entity.name}
            </span>
            {entity.unread ? (
              <span
                title="New federated update"
                aria-label="New federated update"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  flex: "none",
                }}
              />
            ) : null}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {KIND_LABEL[entity.kind]}
            {group ? ` · ${group.label}` : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <RelationshipStatusPill status={entity.status} />
        <span style={traditionBadge}>{entity.tradition}</span>
      </div>

      {entity.summary ? (
        <p
          style={{
            margin: "11px 0 0",
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
          }}
        >
          {entity.summary}
        </p>
      ) : null}

      {entity.due ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 11,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          <DueIcon />
          {entity.due}
        </div>
      ) : null}

      {entity.views && entity.views.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginTop: 10,
          }}
        >
          {entity.views.map((v) => (
            <span
              key={v}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                color: "var(--ink-mute)",
                padding: "2px 7px",
                border: "1px dashed var(--line-2)",
                borderRadius: 999,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      ) : null}

      {onOffer || onWork || onAggregate ? (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 13,
            paddingTop: 11,
            borderTop: "1px solid var(--line)",
          }}
        >
          {onOffer ? (
            <button type="button" onClick={onOffer} style={actionBtn}>
              <OfferIcon />
              Offer
            </button>
          ) : null}
          {onWork ? (
            <button type="button" onClick={onWork} style={actionBtn}>
              <WorkIcon />
              Work
            </button>
          ) : null}
          {onAggregate ? (
            <button type="button" onClick={onAggregate} style={actionBtn}>
              <AggregateIcon />
              Aggregate
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
