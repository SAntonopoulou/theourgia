/**
 * NewsletterComposer · verbatim copy from H08
 * `Theourgia Network Newsletter Composer.dc.html`.
 *
 * The defining honesty moment lives in this surface: every issue
 * carries each recipient's own unsubscribe link, AND once a
 * newsletter is sent it is FROZEN. Both facts surface in the
 * editor's footer disclaimer + the confirm-modal subtitle.
 */

export const NNC_PREVIEW_CTA = "Preview";
export const NNC_SEND_NOW_CTA = "Send now";

/** Header line "{hub} · newsletter". The trailing suffix is
 *  hoisted so the hub name can be parameterised. */
export const NNC_NEWSLETTER_SUFFIX = " · newsletter";
export const NNC_SUBHEADER = "Curated from approved member submissions";

/** Source-picker rail strings. */
export const NNC_SOURCES_HEADING = "Approved submissions";
export const NNC_SOURCES_HELP = "Drag an item into the letter.";

/** Tiptap mini-toolbar labels. */
export const NNC_TOOLBAR_BOLD = "Bold";
export const NNC_TOOLBAR_ITALIC = "Italic";
export const NNC_TOOLBAR_HEADING = "Heading";
export const NNC_TOOLBAR_LINK = "Link";
export const NNC_INSERT_BLOCK = "Insert block";

/** Embed-card pill label rendered above an inline-embedded
 *  curation item. The plan locks the prefix "embedded · {type}". */
export const NNC_EMBED_LABEL = "embedded";

/** Footer disclaimer — the honesty paragraph that lives at the
 *  bottom of every composer. Verbatim. */
export const NNC_FOOTER_DISCLAIMER =
  "Every issue carries each recipient's own unsubscribe link, and a sent newsletter is frozen — it cannot be recalled.";

/** Confirm modal copy. The "{n} members" + " · subtitle" lines
 *  are constructed at render time so the count flows in. */
export const NNC_CONFIRM_HEADER_PREFIX = "Send to ";
export const NNC_CONFIRM_HEADER_SUFFIX = " members?";
export const NNC_CONFIRM_SUBTITLE =
  "Once sent, a newsletter cannot be recalled.";

export const NNC_CONFIRM_NOT_YET = "Not yet";
export const NNC_CONFIRM_SEND_PREFIX = "Send to ";
export const NNC_CONFIRM_SEND_SUFFIX = " members";

/** Submission kinds the source picker can offer. Mirrors the H08
 *  CurationItemKind union from the Hub Admin surface. */
export type NewsletterSourceKind =
  | "entry"
  | "divination"
  | "publication";

/** Discriminated-union members of the newsletter body. Today the
 *  surface accepts plain text paragraphs OR inline-embedded
 *  curation items. A full Tiptap renderer lands later. */
export type NewsletterBodyPart =
  | { kind: "paragraph"; text: string }
  | {
      kind: "embed";
      embedKind: NewsletterSourceKind;
      did: string;
      title: string;
      excerpt: string;
    };
