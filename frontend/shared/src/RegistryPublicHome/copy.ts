/**
 * RegistryPublicHome — H10 Cluster A1 surface copy.
 *
 * Rule 38 — sort options NEVER include popularity. Rule 9 — counts
 * appear only on the per-extension-point tile (load-bearing for
 * navigation, not for ranking).
 */

export type TierKey = "official" | "community" | "unverified";

export interface TierBlock {
  key: TierKey;
  name: string;
  body: string;
}

export const TIER_BLOCKS: readonly TierBlock[] = [
  {
    key: "official",
    name: "Official",
    body: "Read line by line by a Theourgia maintainer — source, migrations, capabilities, and tests. The highest bar; a plugin earns it after months in Community, never automatically.",
  },
  {
    key: "community",
    name: "Community",
    body: "Reviewed at submission by a maintainer and accepted as sound, well-licensed, and honestly declared. The working tier for most plugins.",
  },
  {
    key: "unverified",
    name: "Unverified",
    body: "Published by its author but not yet reviewed by Theourgia maintainers. Install only if you trust the author — the badge is a fact, not a warning.",
  },
];

export interface ExtensionPointTile {
  name: string;
  /** Count rendered as a string — backend may pre-format with locale. */
  count: string;
  desc: string;
}

export interface RecentlyUpdatedItem {
  name: string;
  version: string;
  when: string;
  href?: string;
}

export interface RecentlyAddedItem {
  name: string;
  tier: TierKey;
  when: string;
  href?: string;
}

export const SECTION_LABELS = {
  trustTiers: "The three trust tiers",
  browseByExtensionPoint: "Browse by extension point",
  recentlyUpdated: "Recently updated",
  recentlyAdded: "Recently added",
  forAuthors: "For authors",
} as const;

export const FOR_AUTHORS_BODY =
  "Submission is open. Your plugin must carry an AGPL-compatible license, and every submission is read by a human before it is accepted — there is no automated tier. Bring a manifest and a signed release.";

export const FOR_AUTHORS_CTA = "Submit a plugin";

export const FOOTER_LINKS: readonly { label: string; href: string }[] = [
  { label: "Theourgia main site →", href: "https://theourgia.com" },
  {
    label: "Plugin platform (plan/14)",
    href: "https://github.com/SAntonopoulou/theourgia/blob/main/plan/14-plugin-ecosystem.md",
  },
  { label: "SDK documentation", href: "#" },
  { label: "Code of conduct", href: "#" },
];
