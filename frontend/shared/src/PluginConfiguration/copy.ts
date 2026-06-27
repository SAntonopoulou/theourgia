/**
 * PluginConfiguration · verbatim copy from H09
 * `Theourgia Plugin Configuration.dc.html`.
 */

export const PCF_INTRO =
  "These settings are declared by the plugin. Theourgia validates your input against the plugin's schema before saving.";

export const PCF_DISCARD_CTA = "Discard changes";
export const PCF_SAVE_CTA = "Save";

/** Secret-field rest copy — the existing value is never displayed. */
export const PCF_SECRET_PLACEHOLDER = "••••••••••••";
export const PCF_SECRET_RESET = "Reset";

/** Field-schema kinds the form supports. */
export type ConfigFieldKind =
  | "string"
  | "text"  // multi-line variant of string
  | "number"
  | "boolean"
  | "enum"
  | "secret"
  | "url";
