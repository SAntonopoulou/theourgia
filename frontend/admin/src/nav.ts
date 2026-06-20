import type { VaultNavItem } from "@theourgia/shared";

/**
 * Theourgia admin nav. The order mirrors `agent_onboarding.md`'s
 * "App information architecture": Today first, then content (journal /
 * library / entities), then tools (divination / sigil / circle /
 * talisman), then analytics + settings.
 */
export const ADMIN_NAV: VaultNavItem[] = [
  { to: "/", label: "Today", glyph: "sun" },
  { to: "/journal", label: "Journal", glyph: "journal" },
  { to: "/library", label: "Library", glyph: "library" },
  { to: "/entities", label: "Entities", glyph: "entity" },
  { to: "/divination", label: "Divination", glyph: "divination" },
  { to: "/sigil", label: "Sigil studio", glyph: "sigil" },
  { to: "/circle", label: "Magical circle", glyph: "pentacle" },
  { to: "/talisman", label: "Talismans", glyph: "shield" },
  { to: "/analytics", label: "Analytics", glyph: "compass" },
  { to: "/settings", label: "Settings", glyph: "key" },
  { to: "/foundations", label: "Foundations", glyph: "scroll", dev: true },
];
