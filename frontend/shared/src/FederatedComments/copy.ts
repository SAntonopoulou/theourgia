/**
 * FederatedComments · verbatim copy from H08
 * `Theourgia Federated Comments Stream.dc.html`.
 *
 * Federated replies mark their source openly (rule 24). Layout
 * is identical to local replies otherwise — federation never
 * gets ghosted into a "special quote box."
 */

export const FC_COMPONENT_KICKER = "Component · Comments";

/** Header intro paragraph — verbatim. */
export const FC_INTRO =
  "Replies from this vault and from across the Fediverse, kept in one thread. A federated reply carries its origin openly; otherwise the two are treated the same.";

/** Section labels. */
export const FC_SECTION_APPROVED = "Approved";
export const FC_SECTION_PENDING = "Pending moderation";
export const FC_SECTION_HIDDEN = "Hidden";

/** Owner-only disclosure on Pending + Hidden sections. */
export const FC_OWNER_ONLY = "Only you can see this";

/** Empty-state copy per section. */
export const FC_EMPTY_APPROVED = "No approved comments yet.";
export const FC_EMPTY_PENDING = "Nothing awaiting moderation.";
export const FC_EMPTY_HIDDEN = "You have not hidden any comments.";

/** Federated origin chip. */
export const FC_FROM_GLYPH = "‡";
export const FC_FROM_PREFIX = "from ";

/** Per-comment action labels. */
export const FC_REPLY = "Reply";
export const FC_HIDE = "Hide";
export const FC_UNHIDE = "Unhide";
export const FC_FLAG = "Flag";

export type FcSectionKey = "approved" | "pending" | "hidden";
