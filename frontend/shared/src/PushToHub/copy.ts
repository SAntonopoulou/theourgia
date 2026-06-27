/**
 * PushToHub · verbatim copy from H08
 * `Theourgia Push Content to Hub.dc.html`.
 *
 * Federated push moment — every push is explicit (rule 22), no
 * auto-broadcast. Sealed entries NEVER push (rule 1, defence in
 * depth).
 */

export const PTH_TITLE = "Push to network";
export const PTH_LABEL_CHOOSE_HUBS = "Choose hubs";

/** Helper line under the hubs picker — verbatim. */
export const PTH_NETWORK_HELPER =
  "Your entry is set to Network. Pushed copies are scoped to the selected hubs.";

/** Cache-persistence disclosure — verbatim. */
export const PTH_CACHE_NOTICE =
  "Content already mirrored may persist in caches.";

/** Per-hub curation chip labels — verbatim. */
export const PTH_HUB_TAG_REVIEWS = "This hub reviews submissions";
export const PTH_HUB_TAG_AUTO_CURATES = "This hub auto-curates";

/** Per-hub role prefix — "you're {role}", e.g. "you're an officer". */
export const PTH_ROLE_PREFIX = "you're ";

/** Sealed-entry block copy — verbatim. */
export const PTH_SEALED_TITLE = "Sealed entries cannot be pushed.";
export const PTH_SEALED_BODY = "Sealed content never federates.";

/** Footer CTAs. */
export const PTH_CANCEL_CTA = "Cancel";
export const PTH_PUSH_CTA = "Push";
