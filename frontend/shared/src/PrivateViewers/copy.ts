/**
 * PrivateViewers · verbatim copy from H08
 * `Theourgia Private Viewer Management.dc.html`.
 */

export const PV_TITLE = "Private viewers";
export const PV_SUBTITLE =
  "Read-only access you've granted to scoped content";
export const PV_NEW_VIEWER_CTA = "New viewer";

/** Per-row "Revoked at {ts}" pill. */
export const PV_REVOKED_PREFIX = "Revoked at ";
/** "{handle} · last used {when}". */
export const PV_LAST_USED_PREFIX = " · last used ";

/** Scope chip values + their wire keys. Mirrors the H08
 *  supplement's ``ViewerScope`` union. */
export type PrivateViewerScopeKind =
  | "full"
  | "tag"
  | "kind"
  | "specific";

export const PV_SCOPE_LABELS: Record<PrivateViewerScopeKind, string> = {
  full: "Full vault",
  tag: "By tag",
  kind: "By kind",
  specific: "Specific entries",
};

/** Long-form labels for the modal scope radio (matches .dc.html). */
export const PV_SCOPE_RADIO_LABELS: Record<
  PrivateViewerScopeKind,
  string
> = {
  full: "Full vault",
  tag: "Tag-scoped",
  kind: "Kind-scoped",
  specific: "Specific entries",
};

/** Credential delivery method. */
export type PrivateViewerDeliveryKind = "signed-link" | "passphrase";

export const PV_DELIVERY_LABELS: Record<
  PrivateViewerDeliveryKind,
  string
> = {
  "signed-link": "Email a signed link to the viewer",
  passphrase:
    "Generate a passphrase the viewer enters with the email I provide",
};

/** New-viewer modal strings. */
export const PV_MODAL_TITLE = "New private viewer";
export const PV_LABEL_EMAIL_HANDLE = "Email or handle";
export const PV_LABEL_LABEL = "Label";
export const PV_LABEL_SCOPE = "Access scope";
export const PV_LABEL_DELIVERY = "Credential delivery";
export const PV_EMAIL_PLACEHOLDER = "aspasia@example.com";
export const PV_LABEL_PLACEHOLDER = "Student — Aspasia";

/** Modal footer CTAs. */
export const PV_CANCEL_CTA = "Cancel";
export const PV_ISSUE_CTA = "Issue credential";

/** The shown-once verbatim warning — RULE-LEVEL CRITICAL. The
 *  credential plaintext appears once at issue time and is never
 *  retrievable again. */
export const PV_SHOWN_ONCE_WARNING =
  "This credential is shown ONCE. Save it now.";
