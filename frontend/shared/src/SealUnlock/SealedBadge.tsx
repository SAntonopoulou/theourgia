/**
 * SealedBadge — the inline "Sealed" pill.
 *
 * Used anywhere a sealed item appears in a list / card / header. Pairs
 * with `Tooltip` (when consumer wraps it) to explain the constraint.
 * Verbatim styling from `Theourgia Oaths.dc.html` (the per-item
 * sealed pill at line ~290) — calm violet, never red/danger.
 *
 * Token discipline: all colours come from `--seal` / `--seal-soft` /
 * `--seal-border`. The badge inherits the surrounding text size via
 * the parent's font; the inner pill enforces 10.5px ui font.
 */

import { type CSSProperties } from "react";

import { LockClosed, LockOpen } from "./icons.js";

export interface SealedBadgeProps {
  /** When false, render the "public" form (open lock, ink-soft).
   *  Defaults to true (sealed). */
  sealed?: boolean;
  /** Override the label. Defaults to "Sealed" / "Public". */
  label?: string;
  /** Override the tooltip text. Defaults to the canonical copy. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const SEALED_TOOLTIP = "Only readable on a device with your passphrase";

export function SealedBadge({
  sealed = true,
  label,
  title,
  className,
  style,
}: SealedBadgeProps) {
  const displayLabel = label ?? (sealed ? "Sealed" : "Public");
  const tooltip = title ?? (sealed ? SEALED_TOOLTIP : undefined);

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 9px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    color: sealed ? "var(--seal)" : "var(--ink-soft)",
    background: sealed ? "var(--seal-soft)" : "var(--bg-3)",
    border: `1px solid ${sealed ? "var(--seal-border)" : "var(--line)"}`,
    ...style,
  };

  return (
    <span
      className={className}
      style={base}
      title={tooltip}
      data-sealed={sealed ? "true" : "false"}
    >
      {sealed ? <LockClosed size={11} /> : <LockOpen size={11} />}
      {displayLabel}
    </span>
  );
}
