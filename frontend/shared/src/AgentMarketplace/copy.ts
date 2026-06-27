/**
 * AgentMarketplace — H10 Cluster C2 surface copy.
 *
 * Rule 38 — sort options are alpha · recently-added. NEVER popularity.
 * Rule 29 — tier badges render neutral chrome.
 * Rule 54 — card descriptions use "surface", "find", "draw on" tone.
 */

export type AgentMarketKind =
  | "divination"
  | "study"
  | "synchronicity"
  | "correspondence"
  | "ritual"
  | "archivist";

export type AgentTier = "official" | "community" | "unverified";

export const TIER_LABEL: Record<AgentTier, string> = {
  official: "Official",
  community: "Community",
  unverified: "Unverified",
};

export type SourceFilter = "all" | AgentTier;

export const SOURCE_OPTIONS: readonly { key: SourceFilter; label: string }[] = [
  { key: "all", label: "All sources" },
  { key: "official", label: "Official" },
  { key: "community", label: "Community" },
  { key: "unverified", label: "Unverified" },
];

export type CapabilityFilter =
  | "all"
  | "read_only"
  | "read_write"
  | "read_write_network";

export const CAPABILITY_OPTIONS: readonly {
  key: CapabilityFilter;
  label: string;
}[] = [
  { key: "all", label: "All capability kinds" },
  { key: "read_only", label: "Read-only" },
  { key: "read_write", label: "Read-write" },
  { key: "read_write_network", label: "Read-write + network" },
];

export type SortOption = "alpha" | "recently_added";

export const SORT_OPTIONS: readonly { key: SortOption; label: string }[] = [
  { key: "alpha", label: "Alphabetical" },
  { key: "recently_added", label: "Recently added" },
];

export const VIEW_DETAIL_LABEL = "View detail";
