/**
 * InitiationStatusPill — colored pill for an initiation's status.
 *
 * Per `Theourgia Initiations.dc.html`. Four states keyed to `--is-*`
 * tokens. `suspended` and `resigned` use the care palette (warm
 * amber + dusk violet) — never red. The Initiations record itself is
 * always personal-visibility and sealed; this pill carries one of
 * the two plaintext fields (the other is the tradition name).
 */

import { type CSSProperties } from "react";

export type InitiationStatus =
  | "active"
  | "suspended"
  | "lapsed"
  | "resigned";

export interface InitiationStatusMeta {
  label: string;
  color: string;
}

export const INITIATION_STATUS_META: Record<
  InitiationStatus,
  InitiationStatusMeta
> = {
  active: { label: "Active", color: "var(--is-active)" },
  suspended: { label: "Suspended", color: "var(--is-suspended)" },
  lapsed: { label: "Lapsed", color: "var(--is-lapsed)" },
  resigned: { label: "Resigned", color: "var(--is-resigned)" },
};

export const INITIATION_STATUS_ORDER: InitiationStatus[] = [
  "active",
  "suspended",
  "lapsed",
  "resigned",
];

export interface InitiationStatusPillProps {
  status: InitiationStatus;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function InitiationStatusPill({
  status,
  label,
  className,
  style,
}: InitiationStatusPillProps) {
  const meta = INITIATION_STATUS_META[status];
  return (
    <span
      className={className}
      data-component="initiation-status-pill"
      data-initiation-status={status}
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
