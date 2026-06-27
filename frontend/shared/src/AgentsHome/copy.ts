/**
 * AgentsHome — H10 Cluster C1 surface copy.
 *
 * Rules 50-60 govern this cluster. The most important one here:
 *
 *   Rule 60 — Agent-free is first-class. The empty state explains
 *   what agents can do AND equally why a practitioner might never
 *   use one. Optional forever.
 *
 *   Rule 50 — OFF by default.
 *   Rule 51 — Never speaks first.
 *   Rule 52 — Closed-tradition invisible.
 *   Rule 53 — Sealed content unreachable.
 *   Rule 54 — "Surface" not "interpret" — tone discipline in every
 *   editorial slot here.
 */

export const EDITORIAL_INTRO =
  "Agents are an optional companion layer. They help you surface what is already in your own record — drawing your attention to a recurring symbol, finding resonance between scattered workings — and nothing more. An agent never speaks first; it acts only when you ask. It never sees sealed or closed-tradition content. You remain the ground truth of your practice; an agent is a lens you may pick up or set down. Many practitioners never use one, and that is a complete way to keep a vault.";

export const SECTION_LABELS = {
  active: "Active agents",
  installedDisabled: "Installed but disabled",
} as const;

export const DISABLED_HINT =
  "Disabled agents keep their memory. Re-enable any time to resume where they left off.";

export const DISABLED_ROW_LABEL = "Disabled · memory preserved";

export const BROWSE_MARKETPLACE_CTA = "Browse the marketplace";

export type AgentKind = "divination" | "study" | "synchronicity" | "archivist";

export type AgentStatus = "active" | "paused" | "cost-capped";

export const STATUS_LABEL: Record<AgentStatus, string> = {
  active: "active",
  paused: "paused",
  "cost-capped": "cost-capped",
};

/** Sub-nav keys for the in-surface tabs (rule from `agent_onboarding_H10.md`). */
export type AgentSubnavKey =
  | "agents"
  | "marketplace"
  | "memory"
  | "cost"
  | "settings";

export const SUBNAV_ITEMS: readonly {
  key: AgentSubnavKey;
  label: string;
  href: string;
}[] = [
  { key: "agents", label: "Agents", href: "/agents" },
  { key: "marketplace", label: "Marketplace", href: "/agents/marketplace" },
  { key: "memory", label: "Memory", href: "/agents/memory" },
  { key: "cost", label: "Cost", href: "/agents/cost" },
  { key: "settings", label: "Settings", href: "/agents/settings/keys" },
];

export const EMPTY_STATE = {
  noActiveTitle: "No active agents",
  noActiveBody:
    "You haven't installed any agents yet. The marketplace has six per-purpose agents to choose from — or you can keep your vault agent-free; nothing here requires them.",
} as const;
