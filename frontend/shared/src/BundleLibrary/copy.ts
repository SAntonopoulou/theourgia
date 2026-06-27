/**
 * BundleLibrary · verbatim copy from H09
 * `Theourgia Bundle Library.dc.html`.
 */

export const BL_TITLE = "Bundles";
export const BL_SUBHEAD = "Data that fills Theourgia";
export const BL_BROWSE_REGISTRY_CTA = "Browse registry";

/** Verbatim count-label tail — rule 0 (bundles hold no code). */
export const BL_COUNT_TAIL =
  ". Bundles are installed datasets — they hold no code and request no capabilities.";

/** Citation glyph used by the `‡ {source}` chip on every bundle
 *  card (rule 7 · citation chrome). */
export const BL_CITATION_GLYPH = "‡";

/** Kebab menu — Remove uses --warn. */
export const BL_MENU_LABELS = {
  preview: "Preview",
  update: "Update",
  remove: "Remove",
} as const;

/** Empty state. */
export const BL_EMPTY_TITLE = "No bundles installed.";
export const BL_EMPTY_BODY = "Browse the registry to install one.";
