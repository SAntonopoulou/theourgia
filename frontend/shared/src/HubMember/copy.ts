/**
 * HubMember · verbatim copy from H08
 * `Theourgia Hub Member Dashboard.dc.html`.
 */

export const HM_TAB_LABELS = {
  feed: "Feed",
  subs: "My submissions",
  sharing: "Sharing settings",
} as const;

export type HubMemberTab = keyof typeof HM_TAB_LABELS;

export const HM_TAB_KEYS: readonly HubMemberTab[] = [
  "feed",
  "subs",
  "sharing",
];

/** Header chrome: hub avatar + "Hellenic · you're an officer" line.
 *  The " · you're a(n) {role}" suffix is constructed at render time.
 */
export const HM_YOURE_AN = "you're an ";
export const HM_YOURE_A = "you're a ";

/** "Newsletter" CTA in the topbar. */
export const HM_NEWSLETTER_CTA = "Newsletter";

/** Feed status pill states. */
export type HubSubmissionStatus =
  | "pending"
  | "approved"
  | "sent-back"
  | "withdrawn";

export const HM_STATUS_LABELS: Record<HubSubmissionStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  "sent-back": "Sent back",
  withdrawn: "Withdrawn",
};

/** Submissions table columns. */
export const HM_COL_CONTENT = "Content";
export const HM_COL_SUBMITTED = "Submitted";
export const HM_COL_STATUS = "Status";

/** Withdraw action label + the verbatim cache disclosure (rule 21). */
export const HM_WITHDRAW_LABEL = "Withdraw";
export const HM_WITHDRAW_DISCLOSURE =
  "Withdrawing pulls content from the hub. Content already mirrored may persist in caches.";

/** Sharing-settings header — the standing opt-in rule (rule 28). */
export const HM_SHARING_HEADER =
  "Every share is opt-in. Nothing leaves your vault unless you turn it on here.";

/** The four sharing toggles in the .dc.html order. The H08 brief
 *  locks the default values: ALL FOUR DEFAULT OFF. */
export const HM_SHARING_TOGGLES: ReadonlyArray<{
  key: HubSharingToggle;
  label: string;
}> = [
  { key: "push-workings", label: "Push my workings here" },
  { key: "push-synchronicities", label: "Push my synchronicities here" },
  { key: "push-publications", label: "Push my publications here" },
  {
    key: "announce-membership",
    label: "Announce my membership to other members",
  },
];

export type HubSharingToggle =
  | "push-workings"
  | "push-synchronicities"
  | "push-publications"
  | "announce-membership";

/** Feed-card kind labels. The plan locks three submission kinds
 *  on the curation queue (entry · divination · publication); the
 *  feed broadcasts the same three. */
export type HubFeedItemKind = "working" | "divination" | "publication";
