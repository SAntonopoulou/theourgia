/**
 * SandboxBrowser · verbatim copy from H09
 * `Theourgia Sandbox Browser.dc.html`.
 *
 * H09 rule 36 — sandbox content NEVER federates. The verbatim
 * disclosure renders persistently below the topbar (NOT a
 * tooltip).
 */

export const SB_TITLE = "Sandbox";

/** Verbatim rule-36 disclosure. Renders persistently in the
 *  surface chrome, NOT a tooltip. */
export const SB_RULE_36_DISCLOSURE =
  "Sandbox content is local to this device. It never federates, never appears in network feeds, never reaches the Fediverse — even if you've enabled federation.";

/** Empty state — verbatim. */
export const SB_EMPTY_TITLE = "No active sandboxes.";
export const SB_EMPTY_BODY =
  "Install a bundle into a sandbox to preview it without affecting your main vault.";

/** Per-row CTAs. */
export const SB_OPEN_CTA = "Open";
export const SB_PROMOTE_CTA = "Promote to main";
export const SB_PRESERVE_CTA = "Preserve";
export const SB_DISCARD_CTA = "Discard";

export const SB_CREATED_PREFIX = "Created ";
export const SB_EXPIRES_PREFIX = "Expires in ";
