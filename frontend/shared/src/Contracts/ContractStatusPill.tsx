/**
 * ContractStatusPill — colored pill for a contract's lifecycle state.
 *
 * Per `Theourgia Contracts.dc.html`. Six states keyed to `--cs-*`
 * tokens. Note: **`breached` uses `--cs-breached` (warm amber), NOT
 * `--danger`** — per the project rule, a breach is information about
 * the contract, not a wellbeing failure. The colour communicates the
 * state, the label carries the second signal.
 */

import { type CSSProperties } from "react";

export type ContractStatus =
  | "draft"
  | "active"
  | "fulfilled"
  | "expired"
  | "dissolved"
  | "breached";

export interface ContractStatusMeta {
  label: string;
  /** Token-resolved color. */
  color: string;
}

export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  ContractStatusMeta
> = {
  draft: { label: "Draft", color: "var(--cs-draft)" },
  active: { label: "Active", color: "var(--cs-active)" },
  fulfilled: { label: "Fulfilled", color: "var(--cs-fulfilled)" },
  expired: { label: "Expired", color: "var(--cs-expired)" },
  dissolved: { label: "Dissolved", color: "var(--cs-dissolved)" },
  breached: { label: "Breached", color: "var(--cs-breached)" },
};

export const CONTRACT_STATUS_ORDER: ContractStatus[] = [
  "draft",
  "active",
  "fulfilled",
  "expired",
  "dissolved",
  "breached",
];

export interface ContractStatusPillProps {
  status: ContractStatus;
  /** Override the visible label (defaults to canonical). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function ContractStatusPill({
  status,
  label,
  className,
  style,
}: ContractStatusPillProps) {
  const meta = CONTRACT_STATUS_META[status];
  return (
    <span
      className={className}
      data-component="contract-status-pill"
      data-contract-status={status}
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
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: meta.color,
          flex: "none",
        }}
      />
      {label ?? meta.label}
    </span>
  );
}
