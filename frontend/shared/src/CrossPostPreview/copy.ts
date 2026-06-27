/**
 * CrossPostPreview · verbatim copy from H08
 * `Theourgia Cross-Post Preview.dc.html`.
 *
 * Defining honesty rules:
 *
 *   * The Mastodon preview is rendered in Mastodon's visual
 *     style (NOT Theourgia-branded) so the user sees what their
 *     audience will see.
 *
 *   * Public-only reach is re-stated verbatim (rule 27).
 *
 *   * Graceful degradation of custom extensions is disclosed
 *     verbatim — "never broken markup."
 */

export const CPP_DIALOG_TITLE = "Cross-post to the Fediverse?";

export const CPP_MASTODON_HEADING = "How it appears in Mastodon";
export const CPP_DISCLOSURES_HEADING = "Before you post";

/** The three "Before you post" disclosure bullets — verbatim. */
export const CPP_DISCLOSURE_VISIBILITY_HEAD =
  "Only entries set to ";
export const CPP_DISCLOSURE_VISIBILITY_STRONG = "Public";
export const CPP_DISCLOSURE_VISIBILITY_TAIL =
  " reach the Fediverse. This entry is public.";

export const CPP_DISCLOSURE_DEGRADE =
  "Custom Theourgia extensions — gematria chips, sigils, sensation diagrams — render as plain Notes or Articles in Mastodon. Graceful degradation, never broken markup.";

export const CPP_DISCLOSURE_SETTINGS_HEAD =
  "You can change how this post appears — handle, content warning, object type — in ";
export const CPP_DISCLOSURE_SETTINGS_LINK = "Settings → Fediverse";
export const CPP_DISCLOSURE_SETTINGS_TAIL = ".";

/** CW toggle. */
export const CPP_KEEP_CW = "Keep the content warning";

/** Footer left text + CTAs — verbatim. */
export const CPP_FOOTER_NOTE =
  "Posts once, now. Edits sync if you enable Update activities.";
export const CPP_SKIP_CTA = "Skip cross-post";
export const CPP_CROSSPOST_CTA = "Cross-post";
