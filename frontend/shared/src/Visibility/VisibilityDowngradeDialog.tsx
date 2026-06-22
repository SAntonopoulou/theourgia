/**
 * VisibilityDowngradeDialog — confirm dialog gating a downgrade.
 *
 * Per `Theourgia Visibility.dc.html`. The severity escalates with
 * the target:
 *   - viewer  → constructive (accent)
 *   - hub     → warn (amber)
 *   - public  → danger (red, the ONLY legitimate use of --danger in
 *                       Phase 04+ — the cross-cutting rule)
 *
 * The Public step carries an emphasis line ("you cannot un-read it")
 * that is rendered verbatim from the design.
 *
 * Composes the existing Overlay primitive for focus-trap / ESC /
 * ARIA. The dialog role is `alertdialog` for the danger step,
 * `dialog` for warn / constructive.
 */

import { type CSSProperties, useId } from "react";

import { Overlay } from "../Overlay/Overlay.js";
import type { EntityVisibility } from "../api/types.js";
import {
  VISIBILITY_DOWNGRADE_COPY,
  VISIBILITY_META,
  severityPalette,
} from "./visibility.js";

export type DowngradableTarget = Exclude<EntityVisibility, "personal">;

export interface VisibilityDowngradeDialogProps {
  open: boolean;
  target: DowngradableTarget;
  onConfirm: () => void;
  onCancel: () => void;
  /** Whether the downgrade applies to a single entry (default) or a
   *  batch. When `entryCount > 1`, the body is prefixed with
   *  "N entries will change together." */
  entryCount?: number;
  /** Override the confirm-button label. */
  confirmLabel?: string;
  /** Override the cancel label (defaults to "Keep private"). */
  cancelLabel?: string;
  className?: string;
  style?: CSSProperties;
}

function WarnIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v5 M12 16.5h.01" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx={12} cy={12} r={2.5} />
    </svg>
  );
}

export function VisibilityDowngradeDialog({
  open,
  target,
  onConfirm,
  onCancel,
  entryCount = 1,
  confirmLabel,
  cancelLabel = "Keep private",
  className,
  style,
}: VisibilityDowngradeDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const copy = VISIBILITY_DOWNGRADE_COPY[target];
  const palette = severityPalette(copy.severity);
  const isDanger = copy.severity === "danger";
  const meta = VISIBILITY_META[target];

  const body =
    entryCount > 1
      ? `${entryCount} entries will change together. ${copy.body}`
      : copy.body;

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      role={isDanger ? "alertdialog" : "dialog"}
      ariaLabelledby={titleId}
      ariaDescribedby={bodyId}
    >
      <div
        className={className}
        data-component="visibility-downgrade-dialog"
        data-target={target}
        data-severity={copy.severity}
        style={{
          width: "min(420px, calc(100vw - 32px))",
          background: "var(--bg-2)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: palette.border,
          borderRadius: "var(--r-lg, 14px)",
          padding: 24,
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 13,
            alignItems: "flex-start",
            marginBottom: 13,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              flex: "none",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: palette.soft,
              color: palette.primary,
            }}
          >
            {isDanger ? <EyeIcon /> : <WarnIcon />}
          </span>
          <h3
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              lineHeight: 1.18,
              color: "var(--ink)",
              paddingTop: 2,
            }}
          >
            {copy.title}
          </h3>
        </div>

        <p
          id={bodyId}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
          }}
        >
          {body}
        </p>

        {copy.emphasis ? (
          <div
            data-emphasis
            style={{
              display: "block",
              padding: "11px 13px",
              borderRadius: "var(--r-md, 8px)",
              background: palette.soft,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: palette.border,
              margin: "0 0 16px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--ink)",
              fontWeight: 700,
            }}
          >
            {copy.emphasis}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 6,
            alignItems: "center",
          }}
        >
          <span
            data-target-pill
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              marginRight: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-soft)",
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
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink)",
              padding: "9px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-confirm-button
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 700,
              color: palette.confirmInk,
              background: palette.primary,
              padding: "9px 16px",
              borderRadius: "var(--r-md, 8px)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {confirmLabel ?? copy.confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
