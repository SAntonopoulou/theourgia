/**
 * TierBadge — H09 reusable badge.
 *
 * Three trust tiers rendered with **neutral chrome** (rule 29).
 * Official → --peer-ok-soft border. Community → --network-soft.
 * Unverified → --plugin-disabled-line border on plain background.
 * No red, no green-as-good, no star. The badge is a label.
 *
 * Shared between Registry Browser (7), Registry Plugin Detail (8),
 * and Plugin Author Profile (9).
 */

import type { CSSProperties } from "react";

import { RB_TIER_LABELS, type RegistryTier } from "./copy.js";

export interface TierBadgeProps {
  tier: Exclude<RegistryTier, "all">;
  style?: CSSProperties;
}

const CHROME: Record<
  Exclude<RegistryTier, "all">,
  { ink: string; bg: string; border: string }
> = {
  official: {
    ink: "var(--peer-ok)",
    bg: "var(--peer-ok-soft)",
    border: "var(--peer-ok)",
  },
  community: {
    ink: "var(--network)",
    bg: "var(--network-soft)",
    border: "var(--network-line)",
  },
  unverified: {
    ink: "var(--ink-mute)",
    bg: "transparent",
    border: "var(--plugin-disabled-line)",
  },
};

export function TierBadge({ tier, style }: TierBadgeProps) {
  const c = CHROME[tier];
  return (
    <span
      data-tier-badge={tier}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 11px",
        borderRadius: 20,
        background: c.bg,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: c.border,
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        color: c.ink,
        ...style,
      }}
    >
      {RB_TIER_LABELS[tier]}
    </span>
  );
}
