/**
 * Festival + citation metadata shared across the Calendar surface,
 * the Today widgets, and any other place a magical event is named.
 *
 * Per `Theourgia Calendar.dc.html`. The five tradition tints
 * (--fest-*) are categorical and constant across themes; new
 * traditions arrive only after practitioner consultation, which is
 * what the `soon` flag on a tradition denotes.
 */

export type FestivalTradition =
  | "woty"
  | "greek"
  | "roman"
  | "hekatean"
  | "thelemic"
  | "hindu"
  | "egyptian";

export interface FestivalTraditionMeta {
  /** UI-facing label. */
  name: string;
  /** Resolved colour token. */
  color: string;
  /** True when the tradition is in the catalog but its festival
   *  contents are still under practitioner consultation. The chip
   *  is rendered disabled with a "soon" affix. */
  soon: boolean;
}

export const FESTIVAL_TRADITIONS: Record<
  FestivalTradition,
  FestivalTraditionMeta
> = {
  woty: { name: "Wheel of the Year", color: "var(--fest-woty)", soon: false },
  greek: { name: "Hellenic", color: "var(--fest-greek)", soon: false },
  roman: { name: "Roman", color: "var(--fest-roman)", soon: false },
  hekatean: { name: "Hekatean", color: "var(--fest-hekatean)", soon: false },
  thelemic: { name: "Thelemic", color: "var(--fest-thelemic)", soon: false },
  hindu: { name: "Hindu", color: "var(--ink-mute)", soon: true },
  egyptian: { name: "Egyptian", color: "var(--ink-mute)", soon: true },
};

export const FESTIVAL_TRADITION_ORDER: FestivalTradition[] = [
  "woty",
  "greek",
  "roman",
  "hekatean",
  "thelemic",
  "hindu",
  "egyptian",
];

export type CitationKind = "primary" | "scholarly" | "community";

export interface CitationKindMeta {
  /** Single character glyph used in the badge. */
  glyph: string;
  /** Short label: "Primary source" etc. */
  label: string;
  /** Long-form tooltip: "Primary — ancient or medieval". */
  full: string;
  /** Resolved colour token (token reference). */
  color: string;
  /** One-line description for the legend. */
  description: string;
}

export const CITATION_KINDS: Record<CitationKind, CitationKindMeta> = {
  primary: {
    glyph: "‡",
    label: "Primary source",
    full: "Primary — ancient or medieval",
    color: "var(--ink)",
    description:
      "An ancient or medieval witness — Hesiod, Ovid, the Liber AL. Highest authority.",
  },
  scholarly: {
    glyph: "❖",
    label: "Scholarly",
    full: "Scholarly — modern academic",
    color: "var(--ink-soft)",
    description:
      "Modern academic reconstruction — Burkert, Parker, Hutton. Reconstruction-grade.",
  },
  community: {
    glyph: "✦",
    label: "Living practice",
    full: "Living practice — contemporary",
    color: "var(--accent)",
    description:
      "Contemporary practitioner sources — a tradition as it is actually kept today.",
  },
};

export const CITATION_KIND_ORDER: CitationKind[] = [
  "primary",
  "scholarly",
  "community",
];

export interface FestivalSource {
  kind: CitationKind;
  /** Italicised title of the work. */
  title: string;
  author: string;
  /** Year as a string ("8 CE", "c. 700 BCE", "1996"). */
  year: string;
  /** Optional locator — "VI.249", "pp. 51–52". */
  loc?: string;
  /** Editorial note shown in muted ink below the byline. */
  note?: string;
}

export interface Festival {
  id: string;
  name: string;
  tradition: FestivalTradition;
  /** Glyph rendered in the chip + detail circle. */
  glyph: string;
  /** Human-facing label: "7–15 June", "dark of the moon", etc. */
  label: string;
  /** Day-of-month if single-day. */
  day?: number;
  /** Start day-of-month if multi-day. */
  start?: number;
  /** End day-of-month if multi-day. */
  end?: number;
  /** Full description, one or two sentences. */
  description: string;
  /** Observance — "Mola salsa offered…". */
  practice: string;
  /** Attestation chain — primary / scholarly / community. */
  sources: FestivalSource[];
}
