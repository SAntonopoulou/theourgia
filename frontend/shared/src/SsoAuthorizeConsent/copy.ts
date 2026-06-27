/**
 * SsoAuthorizeConsent · verbatim copy from H08
 * `Theourgia SSO Authorize Consent.dc.html`.
 *
 * The three section headings — verify / receive / authorizes — are
 * **mandatory**. They MUST appear in this order. The surface refuses
 * to render if any of the three values is empty.
 */

export const SSO_DIALOG_LABEL = "Access request";
export const SSO_TITLE_SUFFIX = " is requesting access";

/** "‡ from {instance}" chip — verbatim, the dagger glyph included. */
export const SSO_FROM_PREFIX = "from ";
export const SSO_FROM_GLYPH = "‡"; // ‡

/** Section labels — the three mandatory headings. */
export const SSO_LABEL_VERIFY = "What the hub wants to verify";
export const SSO_LABEL_RECEIVE = "What the hub will receive";
export const SSO_LABEL_AUTHORIZES = "What this assertion authorizes";

/** Verbatim callout. Lives in --warn-soft chrome — NEVER --danger. */
export const SSO_NOT_A_LOGIN =
  "This is NOT a login. Your home instance never sees the hub's pages directly — only this consent moment.";

/** Footer CTAs. */
export const SSO_DECLINE = "Decline";
export const SSO_APPROVE = "Approve";
