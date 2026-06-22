/**
 * ContractListItem — sidebar list item for the Contracts surface.
 *
 * Per `Theourgia Contracts.dc.html`. Shows the binding-kind glyph
 * (slot — typically `BindingKindIcon`), the contract title +
 * entity, a status dot in the right corner, and an optional "next
 * due" footer line that uses `--ob-overdue` accent for at-risk
 * obligations.
 *
 * Composed by the surface's left-rail list, grouped by status
 * (Active / Drafts / Fulfilled / Dissolved / Expired).
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  CONTRACT_STATUS_META,
  type ContractStatus,
} from "./ContractStatusPill.js";

export interface ContractListItemProps {
  id: string;
  title: string;
  /** Display name of the bound entity. */
  entityName: string;
  status: ContractStatus;
  /** Slot for the binding-kind glyph (typically `<BindingKindIcon ... />`). */
  bindingGlyph?: ReactNode;
  /** Color resolved by the caller for the binding-kind tint. */
  bindingColor?: string;
  /** Free-text "next due" hint ("Due in 2 days · Spring offering"). */
  nextDue?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

function ClockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ob-overdue)"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ContractListItem({
  id,
  title,
  entityName,
  status,
  bindingGlyph,
  bindingColor,
  nextDue,
  selected = false,
  onSelect,
  className,
  style,
}: ContractListItemProps) {
  const statusMeta = CONTRACT_STATUS_META[status];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="contract-list-item"
      data-contract-id={id}
      data-contract-status={status}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <span
          aria-hidden="true"
          data-binding-glyph
          style={{
            width: 28,
            height: 28,
            flex: "none",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: bindingColor ?? "var(--ink-soft)",
            background: bindingColor
              ? `color-mix(in srgb, ${bindingColor} 14%, transparent)`
              : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
          }}
        >
          {bindingGlyph}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              lineHeight: 1.2,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {entityName}
          </div>
        </div>
        <span
          aria-hidden="true"
          data-status-dot
          title={statusMeta.label}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusMeta.color,
            flex: "none",
          }}
        />
      </div>
      {nextDue ? (
        <div
          data-next-due
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
          <ClockIcon />
          {nextDue}
        </div>
      ) : null}
    </button>
  );
}
