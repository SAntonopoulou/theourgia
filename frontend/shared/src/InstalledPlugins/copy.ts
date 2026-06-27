/**
 * InstalledPlugins · verbatim copy from H09
 * `Theourgia Installed Plugins.dc.html`.
 */

export const IP_TITLE = "Plugins";
export const IP_SUBHEAD = "Code that extends Theourgia";
export const IP_BROWSE_REGISTRY_CTA = "Browse registry";
export const IP_COUNT_SUFFIX_ONE = " plugin · most recently installed first";
export const IP_COUNT_SUFFIX = " plugins · most recently installed first";

/** Tombstone chip — verbatim from H09 rule 40. */
export const IP_TOMBSTONE_GLYPH = "‡";
export const IP_TOMBSTONE_LABEL = "tombstoned by author";

/** Status chip labels — three states (H09 §S3 surface 1). */
export type PluginStatus = "active" | "disabled" | "error";
export const IP_STATUS_LABELS: Record<PluginStatus, string> = {
  active: "active",
  disabled: "disabled",
  error: "error",
};

/** Kebab menu items — exact order from H09. Uninstall uses --warn. */
export const IP_MENU_LABELS = {
  configure: "Configure",
  activate: "Activate",
  deactivate: "Deactivate",
  update: "Update",
  uninstall: "Uninstall",
  viewCapabilities: "View capabilities",
} as const;

/** Empty state — verbatim. */
export const IP_EMPTY_TITLE = "No plugins installed.";
export const IP_EMPTY_BODY =
  "Browse the registry to extend Theourgia.";

/** 14 plugin kinds for the PluginKindIcon family (H09 §S0). The
 *  build side renders 8-9 common kinds inline; rare kinds fall
 *  back to the `widget` glyph. */
export type PluginKind =
  | "divination"
  | "calendar"
  | "cipher"
  | "correspondence"
  | "editor-block"
  | "widget"
  | "exporter"
  | "importer"
  | "notification"
  | "auth"
  | "storage"
  | "email"
  | "federation-event"
  | "ap-object";
