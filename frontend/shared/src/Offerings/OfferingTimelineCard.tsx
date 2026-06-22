/**
 * OfferingTimelineCard — one row in the offerings timeline.
 *
 * Per `Theourgia Offerings.dc.html`. Time stamp on the left, then
 * entity name + reception pill on the top row, item chips below,
 * intention text, and an `AutoStampChip`-style provenance line at
 * the bottom.
 *
 * Composes editorial constants from `offerings.ts`; receives the
 * shaped offering object and renders. The day grouping ("Today · 21
 * June" / "Yesterday · 20 June" / "18 June") lives in the surface,
 * since it depends on the active locale and clock.
 */

import { type CSSProperties, type ReactNode } from "react";

import type { ReceptionLevel } from "../ReceptionSelector/ReceptionSelector.js";
import {
  type OfferingItemEntry,
  OFFERING_ITEM_META,
  RECEPTION_META,
  offeringCategoryColor,
} from "./offerings.js";

export interface OfferingRecord {
  id: string;
  /** Local time string ("21:40"). */
  time: string;
  /** Entity name (display only — the surface owns linking). */
  entityName: string;
  reception: ReceptionLevel;
  items: OfferingItemEntry[];
  /** Free-text intention line. */
  intention: string;
  /** AutoStamp-style provenance string. */
  stamp: string;
}

export interface OfferingTimelineCardProps {
  offering: OfferingRecord;
  /** Optional onClick — opens the entry in the surface's drawer. */
  onOpen?: () => void;
  className?: string;
  style?: CSSProperties;
}

function StampClockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-mute)"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ReceptionPill({
  reception,
}: {
  reception: ReceptionLevel;
}): ReactNode {
  const meta = RECEPTION_META[reception];
  return (
    <span
      data-reception-pill
      data-reception={reception}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        borderRadius: 999,
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        color: "var(--ink-soft)",
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: `color-mix(in srgb, ${meta.color} 36%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: meta.color,
        }}
      />
      {meta.label}
    </span>
  );
}

function ItemChip({ entry }: { entry: OfferingItemEntry }) {
  const meta = entry.kind ? OFFERING_ITEM_META[entry.kind] : null;
  const color =
    entry.color ??
    (meta ? offeringCategoryColor(meta.category) : "var(--ink-mute)");
  const label = entry.label || meta?.label || "—";
  return (
    <span
      data-item-chip
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        color: "var(--ink-soft)",
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
        }}
      />
      {label}
      {entry.qty || entry.unit ? (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-mute)",
          }}
        >
          · {entry.qty}
          {entry.unit ? ` ${entry.unit}` : ""}
        </span>
      ) : null}
    </span>
  );
}

export function OfferingTimelineCard({
  offering,
  onOpen,
  className,
  style,
}: OfferingTimelineCardProps) {
  const interactive = !!onOpen;
  return (
    <div
      className={className}
      data-component="offering-timeline-card"
      data-offering-id={offering.id}
      data-reception={offering.reception}
      onClick={interactive ? onOpen : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      style={{
        display: "flex",
        gap: 14,
        padding: "15px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
    >
      <div
        data-offering-time
        style={{
          flex: "none",
          textAlign: "right",
          width: 58,
          paddingTop: 2,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          {offering.time}
        </div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <span
            data-entity-name
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16.5,
              color: "var(--ink)",
            }}
          >
            {offering.entityName}
          </span>
          <ReceptionPill reception={offering.reception} />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            margin: "9px 0",
          }}
        >
          {offering.items.map((it, i) => (
            <ItemChip key={i} entry={it} />
          ))}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
          }}
        >
          {offering.intention}
        </p>
        <div
          data-stamp
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginTop: 10,
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--bg-sunk)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
          }}
        >
          <StampClockIcon />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
            }}
          >
            {offering.stamp}
          </span>
        </div>
      </div>
    </div>
  );
}
