/**
 * BulkActionBar — sticky selection bar shown when a multi-select
 * is active.
 *
 * Per `Theourgia Entities.dc.html` (and the same pattern on Library
 * + Visibility). A pill-shaped bar pinned to the bottom of the
 * surface (or floating above a sticky topbar in some cases) with:
 *   - selection-count label ("3 selected")
 *   - one or more action buttons (caller-defined)
 *   - a "Clear" close button on the right
 *
 * The bar is `role="region"` with an `aria-label` describing the
 * selection so screen readers can land on it. The selection count is
 * `aria-live="polite"` so it announces when the count changes.
 */

import { type CSSProperties, type ReactNode } from "react";

export interface BulkActionBarProps {
  /** Pre-formatted selection label ("3 selected", "1 being selected"). */
  label: ReactNode;
  /** Action buttons / chips (caller-defined). */
  actions?: ReactNode;
  /** Called when the close affordance is clicked. */
  onClear?: () => void;
  /** Override the close-button aria-label (default: "Clear selection"). */
  clearLabel?: string;
  /** Positioning preset — sticky to the bottom of the parent (default)
   *  or to the top (for surfaces with bottom-anchored toolbars). */
  position?: "bottom" | "top";
  className?: string;
  style?: CSSProperties;
}

function CloseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function BulkActionBar({
  label,
  actions,
  onClear,
  clearLabel = "Clear selection",
  position = "bottom",
  className,
  style,
}: BulkActionBarProps) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={className}
      data-component="bulk-action-bar"
      data-position={position}
      style={{
        position: "sticky",
        left: 0,
        right: 0,
        [position === "bottom" ? "bottom" : "top"]: 22,
        margin: position === "bottom" ? "0 auto 22px" : "22px auto 0",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 12px 10px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: 999,
        background: "var(--bg-3)",
        boxShadow: "0 16px 40px rgba(0,0,0,.45)",
        width: "fit-content",
        maxWidth: "calc(100% - 32px)",
        ...style,
      }}
    >
      <span
        aria-live="polite"
        data-selection-label
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {actions ? (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: 20,
              background: "var(--line)",
              flex: "none",
            }}
          />
          <div
            data-bulk-actions
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {actions}
          </div>
        </>
      ) : null}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          data-clear-button
          style={{
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            color: "var(--ink-mute)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            flex: "none",
          }}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
