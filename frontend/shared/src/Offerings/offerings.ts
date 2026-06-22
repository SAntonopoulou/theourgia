/**
 * Offerings — shared metadata for offering items + reception levels.
 *
 * Per `Theourgia Offerings.dc.html`. The 14 canonical item kinds
 * (across four category families: liquid · solid · body · time) +
 * the five reception levels (none · faint · clear · strong ·
 * overwhelming). Editorial constants used by both the offerings
 * timeline and the entry-record drawer; surfaces should reference
 * these rather than re-typing strings.
 *
 * Reception is critical for the wellbeing rule — the "None" level
 * is information ("the rite happened, the response did not come"),
 * not failure. It uses --rc-none (neutral), NEVER red.
 */

import type { ReceptionLevel } from "../ReceptionSelector/ReceptionSelector.js";

export type OfferingItemKind =
  | "wine"
  | "water"
  | "milk"
  | "honey"
  | "libation"
  | "incense"
  | "food"
  | "flowers"
  | "money"
  | "blood"
  | "breath"
  | "song"
  | "dance"
  | "time";

export type OfferingItemCategory = "liquid" | "solid" | "body" | "time";

export interface OfferingItemMeta {
  label: string;
  category: OfferingItemCategory;
}

export const OFFERING_ITEM_META: Record<OfferingItemKind, OfferingItemMeta> = {
  wine: { label: "Wine", category: "liquid" },
  water: { label: "Water", category: "liquid" },
  milk: { label: "Milk", category: "liquid" },
  honey: { label: "Honey", category: "liquid" },
  libation: { label: "Libation", category: "liquid" },
  incense: { label: "Incense", category: "solid" },
  food: { label: "Food", category: "solid" },
  flowers: { label: "Flowers", category: "solid" },
  money: { label: "Money", category: "solid" },
  blood: { label: "Blood", category: "body" },
  breath: { label: "Breath", category: "body" },
  song: { label: "Song", category: "body" },
  dance: { label: "Dance", category: "body" },
  time: { label: "Time", category: "time" },
};

export const OFFERING_ITEM_ORDER: OfferingItemKind[] = [
  "wine",
  "water",
  "milk",
  "honey",
  "libation",
  "incense",
  "food",
  "flowers",
  "money",
  "blood",
  "breath",
  "song",
  "dance",
  "time",
];

export function offeringCategoryColor(category: OfferingItemCategory): string {
  switch (category) {
    case "liquid":
      return "var(--cat-liquid)";
    case "solid":
      return "var(--cat-solid)";
    case "body":
      return "var(--cat-body)";
    case "time":
      return "var(--cat-time)";
  }
}

export interface ReceptionMeta {
  label: string;
  color: string;
}

export const RECEPTION_META: Record<ReceptionLevel, ReceptionMeta> = {
  none: { label: "None", color: "var(--rc-none)" },
  faint: { label: "Faint", color: "var(--rc-faint)" },
  clear: { label: "Clear", color: "var(--rc-clear)" },
  strong: { label: "Strong", color: "var(--rc-strong)" },
  overwhelming: { label: "Overwhelming", color: "var(--rc-over)" },
};

export const RECEPTION_ORDER: ReceptionLevel[] = [
  "none",
  "faint",
  "clear",
  "strong",
  "overwhelming",
];

/** Free-text or known-kind item entry as recorded against an offering. */
export interface OfferingItemEntry {
  /** Known kind, or `null` for a custom-typed item. */
  kind: OfferingItemKind | null;
  /** Display label — falls back to the kind's canonical label. */
  label: string;
  /** Free-text quantity ("1", "a handful", "—"). */
  qty?: string;
  /** Free-text unit ("dram", "stalk"). */
  unit?: string;
  /** Resolved category color; if absent, callers derive from kind. */
  color?: string;
}
