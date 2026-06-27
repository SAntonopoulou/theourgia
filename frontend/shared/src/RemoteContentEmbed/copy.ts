/**
 * RemoteContentEmbed · verbatim copy from H08
 * `Theourgia Remote Content Embed.dc.html`.
 *
 * The embed card preserves the federated origin in every state.
 * "Remote words are never quietly absorbed into your own."
 */

/** "‡ from {instance}" — the dagger glyph + literal " from " + instance. */
export const RCE_FROM_GLYPH = "‡";
export const RCE_FROM_PREFIX = "from ";

/** "View original →" link copy — verbatim. */
export const RCE_VIEW_ORIGINAL = "View original →";

/** Unresolvable state — verbatim. */
export const RCE_UNRESOLVABLE_TITLE =
  "Original post no longer available";

export type RemoteContentEmbedState =
  | "resolvable"
  | "loading"
  | "unresolvable";
