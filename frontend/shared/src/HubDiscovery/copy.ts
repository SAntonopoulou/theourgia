/**
 * HubDiscovery · verbatim copy from H08
 * `Theourgia Hub Discovery.dc.html`.
 */

export const HD_TITLE = "Discover hubs";
export const HD_SUBTITLE =
  "Public hubs across the instances your instance knows";

export const HD_SEARCH_PLACEHOLDER =
  "Search hub names, traditions, or keywords";

/** The "All" tradition chip — verbatim. */
export const HD_ALL_TRADITIONS = "All";

/** The eight tradition options offered (lowercase keys; the chip
 *  capitalises for display per the .dc.html). */
export const HD_TRADITION_KEYS: readonly string[] = [
  "hellenic",
  "thelemic",
  "chaos",
  "hermetic",
  "folk",
  "ceremonial",
  "independent",
  "multi-tradition",
];

/** Hub membership policy — drives the CTA copy + chip colour. */
export type MembershipPolicy = "public" | "open-with-approval" | "private";

/** Verbatim policy chip labels. */
export const HD_POLICY_LABELS: Record<MembershipPolicy, string> = {
  public: "Public",
  "open-with-approval": "Open with approval",
  private: "Private",
};

/** Verbatim CTA labels per (policy, isMember) combination. */
export const HD_CTA_REQUEST = "Request to join";
export const HD_CTA_ALREADY = "Already a member";
export const HD_CTA_INVITATION_ONLY = "This hub is invitation-only";

/** "{n} members" — quiet stat suffix, never standalone. */
export const HD_MEMBERS_SUFFIX = " members";

/** Empty-state copy per the H08 brief — verbatim. */
export const HD_EMPTY_TITLE = "No matching hubs";
export const HD_EMPTY_BODY =
  "Hubs choose whether to appear in the directory — many private hubs are joinable only by invitation.";
