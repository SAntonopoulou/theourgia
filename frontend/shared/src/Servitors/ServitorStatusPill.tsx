/**
 * ServitorStatusPill — colored pill for a servitor's lifecycle state.
 *
 * Per `Theourgia Servitors.dc.html`. Four states keyed to `--ss-*`
 * tokens. `decommissioned` uses a muted lavender (--ss-decommissioned),
 * NEVER red — a banished servitor is information, not a UI emergency.
 *
 * Per the H03 wellbeing rule the language is matter-of-fact: the
 * design's editorial copy talks about "retire — honor & release"
 * and "decommission — banish", not punishment.
 */

import { type CSSProperties } from "react";

export type ServitorStatus =
  | "active"
  | "dormant"
  | "retired"
  | "decommissioned";

export interface ServitorStatusMeta {
  label: string;
  color: string;
}

export const SERVITOR_STATUS_META: Record<
  ServitorStatus,
  ServitorStatusMeta
> = {
  active: { label: "Active", color: "var(--ss-active)" },
  dormant: { label: "Dormant", color: "var(--ss-dormant)" },
  retired: { label: "Retired", color: "var(--ss-retired)" },
  decommissioned: {
    label: "Decommissioned",
    color: "var(--ss-decommissioned)",
  },
};

export const SERVITOR_STATUS_ORDER: ServitorStatus[] = [
  "active",
  "dormant",
  "retired",
  "decommissioned",
];

export interface ServitorStatusPillProps {
  status: ServitorStatus;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function ServitorStatusPill({
  status,
  label,
  className,
  style,
}: ServitorStatusPillProps) {
  const meta = SERVITOR_STATUS_META[status];
  return (
    <span
      className={className}
      data-component="servitor-status-pill"
      data-servitor-status={status}
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
