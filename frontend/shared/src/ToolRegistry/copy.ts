/**
 * ToolRegistry — verbatim copy + fixtures from
 * `Theourgia Tool Registry.dc.html` (H05).
 *
 * Honesty rule (H05 §S2.4): a tool is "consecrated" ONLY by linking
 * a consecration working — there is no decoupled toggle. Use
 * history is computed and read-only. Status pills use the care
 * palette (`--care*`); --danger appears nowhere.
 *
 * 14 fixed tool kinds (don't extend without build-side review). The
 * 14 kind icons live in `./ToolKindIcon.tsx` for now; H05 §S6 #2
 * promotes them to `theourgia-icons.svg` as `<symbol>`s in a
 * follow-up batch.
 */

export type ToolKind =
  | "wand"
  | "athame"
  | "chalice"
  | "pentacle"
  | "censer"
  | "bell"
  | "sword"
  | "lamp"
  | "mirror"
  | "bowl"
  | "statue"
  | "cingulum"
  | "robe"
  | "other";

export type RegistryView = "tools" | "altars";

export interface ToolKindDef {
  key: ToolKind;
  label: string;
}

/** 14 fixed tool kinds — order matches the H05 kind-filter row. */
export const TOOL_KINDS: readonly ToolKindDef[] = [
  { key: "wand", label: "Wand" },
  { key: "athame", label: "Athame" },
  { key: "chalice", label: "Chalice" },
  { key: "pentacle", label: "Pentacle" },
  { key: "censer", label: "Censer" },
  { key: "bell", label: "Bell" },
  { key: "sword", label: "Sword" },
  { key: "lamp", label: "Lamp" },
  { key: "mirror", label: "Mirror" },
  { key: "bowl", label: "Bowl" },
  { key: "statue", label: "Statue" },
  { key: "cingulum", label: "Cingulum" },
  { key: "robe", label: "Robe" },
  { key: "other", label: "Other" },
];

export const ALL_FILTER_LABEL = "All";

/* ─── Topbar + view picker ──────────────────────────────────── */

export const TR_TOPBAR_TITLE = "Tool Registry";
export const TR_TOPBAR_SUBTITLE =
  "Your ritual implements and the altars they keep";
export const VIEW_TOOLS_LABEL = "Tools";
export const VIEW_ALTARS_LABEL = "Altars";

/* ─── Search + new-button row ────────────────────────────────── */

export const SEARCH_TOOLS_PLACEHOLDER = "Search tools…";
export const SEARCH_ALTARS_PLACEHOLDER = "Search altars…";
export const NEW_TOOL_LABEL = "New tool";
export const NEW_ALTAR_LABEL = "New altar";

/* ─── Tool card pill copy ────────────────────────────────────── */

export const TR_NOT_YET_CONSECRATED = "Not yet consecrated";
/** Prefix for consecrated pill text — followed by the date. */
export const TR_CONSECRATED_PREFIX = "Consecrated · ";

/* ─── Altars list copy ───────────────────────────────────────── */

export const ALTAR_PERMANENT_PILL = "permanent";

/* ─── Tool detail drawer — section eyebrows ──────────────────── */

export const TR_IDENTITY_EYEBROW = "Identity";
export const TR_MATERIALS_EYEBROW = "Materials & dimensions";
export const TR_PROVENANCE_EYEBROW = "Provenance";
export const TR_CONSECRATION_EYEBROW = "Consecration";
export const TR_USE_HISTORY_EYEBROW = "Use history";
export const TR_USE_HISTORY_READONLY_PILL = "read-only";
export const TR_CURRENT_LOCATION_EYEBROW = "Current location";

export const TR_LINK_CONSECRATION_CTA = "Link a consecration working";
export const TR_NOT_YET_BODY = "Not yet consecrated.";

/** Load-bearing honesty copy. **Verbatim.** */
export const TR_CONSECRATION_HONESTY_NOTE =
  "Status follows the record — a tool is consecrated by linking the " +
  "working where it happened, never by a switch.";

/** "Consecrated on {date}" prefix; the surface inserts the date. */
export const TR_CONSECRATED_ON_PREFIX = "Consecrated on ";

/* ─── Demo data (verbatim from the mockup) ───────────────────── */

export interface ToolHistoryEntry {
  title: string;
  entity: string;
  date: string;
}

export interface ToolRecord {
  id: string;
  kind: ToolKind;
  name: string;
  desc: string;
  materials: readonly string[];
  dims: string;
  prov: string;
  /** ISO-ish date string ("19 Mar 2024") or null if not consecrated. */
  consDate: string | null;
  /** Working title — only present when consDate is. */
  consWorking: string | null;
  /** Linked entity name; nullable. */
  entity: string | null;
  /** Background tint for the card photo tile (rgba). */
  tint: string;
  location: string;
  history: readonly ToolHistoryEntry[];
}

export const DEMO_TOOLS: readonly ToolRecord[] = [
  {
    id: "athame-hekate",
    kind: "athame",
    name: "Black-handled athame",
    desc:
      "A double-edged blade with a black hilt, used to direct and to cut the circle.",
    materials: ["steel", "ebony hilt", "engraved sigils"],
    dims: "length 24 cm · weight 110 g",
    prov:
      "Made by my own hand in the dark of the moon, March 2024; the blade tempered three times.",
    consDate: "19 Mar 2024",
    consWorking: "Consecration of the Athame to Hekate",
    entity: "Hekate",
    tint: "rgba(126,145,206,.14)",
    location: "On the household altar, north point",
    history: [
      {
        title: "Crossroads offering at the dark moon",
        entity: "Hekate",
        date: "15 Jun",
      },
      { title: "Opening of the watchtowers", entity: "—", date: "08 Jun" },
      { title: "Beltane working", entity: "Brigid", date: "01 May" },
    ],
  },
  {
    id: "wand-olive",
    kind: "wand",
    name: "Olive-wood wand",
    desc:
      "Cut from a fallen olive branch, stripped and oiled; the tip capped in copper.",
    materials: ["olive wood", "copper cap"],
    dims: "length 33 cm",
    prov: "Gathered on Aegina, summer 2023.",
    consDate: "21 Jun 2023",
    consWorking: "Solar consecration at the solstice",
    entity: "Apollon",
    tint: "rgba(110,142,99,.14)",
    location: "Eastern cabinet, top shelf",
    history: [
      {
        title: "Invocation of the rising sun",
        entity: "Apollon",
        date: "21 Mar",
      },
      { title: "Hour-of-Jupiter blessing", entity: "—", date: "12 Feb" },
    ],
  },
  {
    id: "chalice-bronze",
    kind: "chalice",
    name: "Bronze chalice",
    desc: "A wide-bowled cup for libation and for the element of water.",
    materials: ["cast bronze"],
    dims: "height 16 cm · capacity 250 ml",
    prov: "Bought at a market in Thessaloniki, 2022.",
    consDate: null,
    consWorking: null,
    entity: null,
    tint: "rgba(199,162,76,.10)",
    location: "Kitchen shelf",
    history: [],
  },
  {
    id: "censer-brass",
    kind: "censer",
    name: "Brass censer",
    desc: "A hanging three-chain censer for resin and charcoal.",
    materials: ["brass", "iron chain"],
    dims: "height 22 cm",
    prov: "Inherited from my grandmother.",
    consDate: "02 Feb 2024",
    consWorking: "Purification of the censer",
    entity: null,
    tint: "rgba(199,162,76,.12)",
    location: "On the household altar",
    history: [
      { title: "Suffumigation before evocation", entity: "—", date: "10 Jun" },
    ],
  },
  {
    id: "bell-brass",
    kind: "bell",
    name: "Small brass bell",
    desc: "Rung to open and to close, and to clear the air.",
    materials: ["brass"],
    dims: "height 8 cm",
    prov: "A gift from a teacher.",
    consDate: null,
    consWorking: null,
    entity: null,
    tint: "rgba(199,162,76,.10)",
    location: "On the household altar",
    history: [],
  },
  {
    id: "mirror-obsidian",
    kind: "mirror",
    name: "Obsidian black mirror",
    desc:
      "A polished disc of obsidian set in a wooden frame, for scrying.",
    materials: ["obsidian", "walnut frame"],
    dims: "diameter 18 cm",
    prov: "Knapped and polished over a winter.",
    consDate: "30 Oct 2023",
    consWorking: "Consecration of the speculum",
    entity: null,
    tint: "rgba(60,52,72,.18)",
    location: "Wrapped in black silk, storage box 3",
    history: [
      {
        title: "Scrying session — the threshold",
        entity: "—",
        date: "18 Jun",
      },
      { title: "Dark-moon scry", entity: "Hekate", date: "29 May" },
    ],
  },
  {
    id: "statue-hekate",
    kind: "statue",
    name: "Bronze Hekate triformis",
    desc: "A small three-formed image of the goddess, the household focus.",
    materials: ["cast bronze"],
    dims: "height 21 cm",
    prov: "Commissioned from a sculptor, 2021.",
    consDate: "13 Aug 2021",
    consWorking: "Installation of the household image",
    entity: "Hekate",
    tint: "rgba(126,145,206,.14)",
    location: "Centre of the household altar",
    history: [
      { title: "Deipnon — the monthly supper", entity: "Hekate", date: "15 Jun" },
      { title: "Annual rite of Hekate", entity: "Hekate", date: "13 Aug" },
    ],
  },
  {
    id: "bowl-clay",
    kind: "bowl",
    name: "Clay offering bowl",
    desc: "An unglazed earthenware bowl for grain, honey, and earth offerings.",
    materials: ["fired clay"],
    dims: "diameter 14 cm",
    prov: "Made at a pottery class.",
    consDate: null,
    consWorking: null,
    entity: null,
    tint: "rgba(188,128,80,.12)",
    location: "On the household altar",
    history: [],
  },
];

export interface AltarRecord {
  id: string;
  name: string;
  permanent: boolean;
  toolCount: number;
  workings: string;
}

/** Demo altars verbatim from the mockup `altarRows`. */
export const DEMO_ALTARS: readonly AltarRecord[] = [
  {
    id: "household",
    name: "The household altar",
    permanent: true,
    toolCount: 6,
    workings: "tended monthly · 14 workings",
  },
  {
    id: "travel",
    name: "Travelling kit",
    permanent: false,
    toolCount: 3,
    workings: "packed as needed · 4 workings",
  },
];

/* ─── Helpers ──────────────────────────────────────────────────── */

export function toolKindLabel(kind: ToolKind): string {
  return TOOL_KINDS.find((k) => k.key === kind)?.label ?? "Other";
}

export function searchPlaceholder(view: RegistryView): string {
  return view === "tools"
    ? SEARCH_TOOLS_PLACEHOLDER
    : SEARCH_ALTARS_PLACEHOLDER;
}

export function newButtonLabel(view: RegistryView): string {
  return view === "tools" ? NEW_TOOL_LABEL : NEW_ALTAR_LABEL;
}
