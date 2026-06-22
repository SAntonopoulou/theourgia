/**
 * Visibility — shared types, ordering, and editorial copy.
 *
 * Per `Theourgia Visibility.dc.html`. The four visibility levels and
 * the load-bearing rule "raising privacy applies at once; lowering
 * it asks first". The copy strings for each downgrade target are
 * rendered verbatim because the practitioner needs to understand
 * the exposure exactly.
 */

import type { EntityVisibility } from "../api/types.js";

export const VISIBILITY_ORDER: EntityVisibility[] = [
  "personal",
  "viewer",
  "hub",
  "public",
];

export interface VisibilityLevelMeta {
  label: string;
  /** Token-resolved color for the dot. */
  color: string;
}

export const VISIBILITY_META: Record<EntityVisibility, VisibilityLevelMeta> = {
  personal: { label: "Personal", color: "var(--vis-personal)" },
  viewer: { label: "Viewer", color: "var(--vis-viewer)" },
  hub: { label: "Hub", color: "var(--vis-hub)" },
  public: { label: "Public", color: "var(--vis-public)" },
};

/** Numeric privacy index: 0 = most private, 3 = most public. */
export function visibilityIndex(v: EntityVisibility): number {
  return VISIBILITY_ORDER.indexOf(v);
}

export function isDowngrade(
  from: EntityVisibility,
  to: EntityVisibility,
): boolean {
  return visibilityIndex(to) > visibilityIndex(from);
}

/**
 * "Constructive" → the change is a quiet ask (Viewer).
 * "Warn"        → tone steps up (Hub — visible to every hub member, not just named).
 * "Danger"      → the load-bearing irreversible exposure (Public).
 *
 * Per the project rule, --danger is reserved for Visibility → Public; no
 * other negative state in Phase 04 / 05 uses red.
 */
export type DowngradeSeverity = "constructive" | "warn" | "danger";

export interface DowngradeCopy {
  title: string;
  body: string;
  /** Optional emphasis line shown in a colored callout. */
  emphasis?: string;
  severity: DowngradeSeverity;
  /** Confirm-button label. */
  confirmLabel: string;
}

/**
 * Verbatim from `Theourgia Visibility.dc.html`. Keyed by target level
 * (the destination of the downgrade, never the source).
 */
export const VISIBILITY_DOWNGRADE_COPY: Record<
  Exclude<EntityVisibility, "personal">,
  DowngradeCopy
> = {
  viewer: {
    title: "Make this visible to your viewers?",
    body:
      "This entry becomes visible to your named private viewers. They can read it, copy it, and reference it in their own work.",
    severity: "constructive",
    confirmLabel: "Share with viewers",
  },
  hub: {
    title: "Share with hub members?",
    body:
      "This entry becomes visible to every member of the hubs it is tagged into — not just people you have named individually.",
    severity: "warn",
    confirmLabel: "Share with hub",
  },
  public: {
    title: "Publish to your public site?",
    body:
      "This entry will appear on your public site, in search engines, and in federation feeds across the network.",
    emphasis:
      "You can unpublish it later — but you cannot un-read it. Assume anything published may be copied.",
    severity: "danger",
    confirmLabel: "Publish entry",
  },
};

export interface SeverityPalette {
  /** Solid colour for the confirm button + the icon. */
  primary: string;
  /** 14-22% alpha tint used as panel background and emphasis-row bg. */
  soft: string;
  /** ~45-55% alpha border tone. */
  border: string;
  /** Foreground colour for the confirm button text. */
  confirmInk: string;
}

export function severityPalette(severity: DowngradeSeverity): SeverityPalette {
  if (severity === "danger")
    return {
      primary: "var(--danger)",
      soft: "var(--danger-soft)",
      border: "var(--danger-border)",
      confirmInk: "#fff",
    };
  if (severity === "warn")
    return {
      primary: "var(--warn)",
      soft: "var(--warn-soft)",
      border: "var(--warn-border)",
      confirmInk: "#fff",
    };
  return {
    primary: "var(--accent)",
    soft: "var(--accent-soft)",
    border: "var(--line-2)",
    confirmInk: "var(--accent-ink)",
  };
}
