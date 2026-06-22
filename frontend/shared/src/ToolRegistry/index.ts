/**
 * Tool Registry surface — H05 Workshop · fifth surface.
 *
 * List-and-detail composition matching B65 Library. 14 fixed tool
 * kinds + altars view. Consecration status DERIVED from a linked
 * working — there's no decoupled toggle (H05 §S2.4 honesty).
 */

export {
  ALL_FILTER_LABEL,
  ALTAR_PERMANENT_PILL,
  DEMO_ALTARS,
  DEMO_TOOLS,
  NEW_ALTAR_LABEL,
  NEW_TOOL_LABEL,
  SEARCH_ALTARS_PLACEHOLDER,
  SEARCH_TOOLS_PLACEHOLDER,
  TOOL_KINDS,
  TR_CONSECRATED_ON_PREFIX,
  TR_CONSECRATED_PREFIX,
  TR_CONSECRATION_EYEBROW,
  TR_CONSECRATION_HONESTY_NOTE,
  TR_CURRENT_LOCATION_EYEBROW,
  TR_IDENTITY_EYEBROW,
  TR_LINK_CONSECRATION_CTA,
  TR_MATERIALS_EYEBROW,
  TR_NOT_YET_BODY,
  TR_NOT_YET_CONSECRATED,
  TR_PROVENANCE_EYEBROW,
  TR_TOPBAR_SUBTITLE,
  TR_TOPBAR_TITLE,
  TR_USE_HISTORY_EYEBROW,
  TR_USE_HISTORY_READONLY_PILL,
  VIEW_ALTARS_LABEL,
  VIEW_TOOLS_LABEL,
  newButtonLabel,
  searchPlaceholder,
  toolKindLabel,
} from "./copy.js";
export type {
  AltarRecord,
  RegistryView,
  ToolHistoryEntry,
  ToolKind,
  ToolKindDef,
  ToolRecord,
} from "./copy.js";

export { AltarsList } from "./AltarsList.js";
export type { AltarsListProps } from "./AltarsList.js";

export { ToolCard } from "./ToolCard.js";
export type { ToolCardProps } from "./ToolCard.js";

export { ToolDetailDrawer } from "./ToolDetailDrawer.js";
export type { ToolDetailDrawerProps } from "./ToolDetailDrawer.js";

export { ToolKindIcon } from "./ToolKindIcon.js";
export type { ToolKindIconProps } from "./ToolKindIcon.js";

export { ToolRegistrySurface } from "./ToolRegistrySurface.js";
export type {
  ToolKindFilter,
  ToolRegistrySurfaceProps,
} from "./ToolRegistrySurface.js";
