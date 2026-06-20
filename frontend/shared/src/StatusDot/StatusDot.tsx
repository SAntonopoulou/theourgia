/**
 * StatusDot — colored dot paired with text.
 *
 * The "color never alone" rule: a dot's tone carries one signal, the
 * paired label carries the same signal in text. Used for federation
 * health, verifier results, sync state, etc.
 */

import type { CSSProperties, ReactNode } from "react";

export type StatusKind = "ok" | "warn" | "error" | "neutral" | "pending";

export interface StatusDotProps {
  status: StatusKind;
  /** Paired text — required (color never alone). */
  label: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function statusColor(status: StatusKind): string {
  switch (status) {
    case "ok":
      return "var(--success)";
    case "warn":
      return "var(--warning)";
    case "error":
      return "var(--danger)";
    case "pending":
      return "var(--info)";
    default:
      return "var(--ink-mute)";
  }
}

export function StatusDot({ status, label, className, style }: StatusDotProps) {
  const composedStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2, 8px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-ui, 12px)",
    color: "var(--ink-soft)",
    ...style,
  };

  return (
    <span className={className} style={composedStyle} data-status={status}>
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: statusColor(status),
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </span>
  );
}
