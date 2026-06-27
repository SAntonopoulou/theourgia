/**
 * FollowersPane · verbatim copy from H08
 * `Theourgia Followers Pane.dc.html`.
 *
 * Consent-first followers (H08 rule 19). Engagement metrics
 * never displayed beyond the simple count (rule 18 ·
 * no-gamification).
 */

export const FP_TITLE = "Followers";

/** Count formatter — the only metric the surface exposes. */
export const FP_COUNT_SUFFIX = " followers";
export const FP_COUNT_SUFFIX_ONE = " follower";

/** Tab labels. */
export const FP_TAB_FOLLOWERS = "Followers";
export const FP_TAB_PENDING = "Pending approvals";

/** Followers-tab helper, verbatim — the no-metrics rule. */
export const FP_NO_METRICS_NOTE =
  "Listed in the order they followed — newest first. Theourgia keeps no engagement metrics beyond this count.";

/** Per-card body — "following you {since}". */
export const FP_FOLLOWING_YOU_PREFIX = "following you ";

/** Pending-tab callout, verbatim. */
export const FP_PENDING_CALLOUT =
  "You approve follows manually. These accounts asked to follow your public actor; approving lets them see your public posts in their timeline.";

/** Pending CTAs — Decline uses --warn (consequential edit, not danger). */
export const FP_APPROVE_CTA = "Approve";
export const FP_DECLINE_CTA = "Decline";

/** Empty state for pending tab. */
export const FP_PENDING_EMPTY_TITLE = "No requests waiting.";
export const FP_PENDING_EMPTY_BODY =
  "New follow requests appear here for your review.";

/** Kebab a11y label. */
export const FP_FOLLOWER_ACTIONS_LABEL = "Follower actions";
