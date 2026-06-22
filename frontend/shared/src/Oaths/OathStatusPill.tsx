/**
 * OathStatusPill — colored pill for an oath's lifecycle state.
 *
 * Per `Theourgia Oaths.dc.html`. Five states keyed to `--os-*`
 * tokens. Critically: `broken` and `renounced` use the care palette
 * (warm amber and dusk violet respectively), NEVER red. An oath's
 * end is not a UI emergency — the rule is calm.
 */

import { type CSSProperties } from "react";

export type OathStatus =
  | "active"
  | "fulfilled"
  | "broken"
  | "renounced"
  | "lapsed";

export interface OathStatusMeta {
  label: string;
  color: string;
}

export const OATH_STATUS_META: Record<OathStatus, OathStatusMeta> = {
  active: { label: "Active", color: "var(--os-active)" },
  fulfilled: { label: "Fulfilled", color: "var(--os-fulfilled)" },
  broken: { label: "Broken", color: "var(--os-broken)" },
  renounced: { label: "Renounced", color: "var(--os-renounced)" },
  lapsed: { label: "Lapsed", color: "var(--os-lapsed)" },
};

export const OATH_STATUS_ORDER: OathStatus[] = [
  "active",
  "fulfilled",
  "broken",
  "renounced",
  "lapsed",
];

export interface OathStatusPillProps {
  status: OathStatus;
  /** Override the visible label (defaults to canonical). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function OathStatusPill({
  status,
  label,
  className,
  style,
}: OathStatusPillProps) {
  const meta = OATH_STATUS_META[status];
  return (
    <span
      className={className}
      data-component="oath-status-pill"
      data-oath-status={status}
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
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: meta.color,
          flex: "none",
        }}
      />
      {label ?? meta.label}
    </span>
  );
}
