/**
 * RegistryBrowser · verbatim copy from H09
 * `Theourgia Registry Browser.dc.html`.
 */

export const RB_BREADCRUMB_ROOT = "Plugins";
export const RB_TITLE = "Plugin registry";
export const RB_SUBHEAD = "Three tiers of trust";

/** Registry citation framing — verbatim. */
export const RB_REGISTRY_CITATION_PREFIX = "from ";
export const RB_REGISTRY_CITATION_INSTANCE = "registry.theourgia.com";
export const RB_CITATION_GLYPH = "‡";

/** Tier chip labels — neutral chrome (rule 29). */
export type RegistryTier =
  | "all"
  | "official"
  | "community"
  | "unverified";

export const RB_TIER_LABELS: Record<RegistryTier, string> = {
  all: "All",
  official: "Official",
  community: "Community",
  unverified: "Unverified",
};

/** Sort options — alpha / recent-update / recently-added.
 *  NEVER popularity (rule 38). */
export type RegistrySort =
  | "alpha"
  | "recent-update"
  | "recently-added";

export const RB_SORT_LABELS: Record<RegistrySort, string> = {
  alpha: "Alphabetical",
  "recent-update": "Recently updated",
  "recently-added": "Recently added",
};

export const RB_SORT_LABEL = "Sort";

/** Empty state. */
export const RB_EMPTY_TITLE = "No plugins match your filter.";
export const RB_EMPTY_BODY = "Try widening the tier or tradition selection.";

/** View card CTA. */
export const RB_VIEW_CTA = "View";
