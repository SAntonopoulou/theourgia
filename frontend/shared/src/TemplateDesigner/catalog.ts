/**
 * Template Designer — block-kind catalog.
 *
 * Per `Theourgia Template Designer.dc.html`. Twenty block kinds in
 * three categories (magickal · formatting · inline marks). Every
 * surface that lets the practitioner build or use a template draws
 * from this same catalog.
 *
 * Glyph paths are designer-supplied SVG `d` strings for a 24×24
 * viewBox; rendered by `BlockGlyph` at the call site. Some paths
 * are arrays of segments to keep the line-art legible at small sizes.
 */

export type BlockCategory = "magick" | "format" | "mark";

export interface BlockCategoryMeta {
  label: string;
  color: string;
}

export const BLOCK_CATEGORIES: Record<BlockCategory, BlockCategoryMeta> = {
  magick: { label: "Magickal blocks", color: "var(--magick)" },
  format: { label: "Formatting", color: "var(--format)" },
  mark: { label: "Inline marks", color: "var(--mark)" },
};

export const BLOCK_CATEGORY_ORDER: BlockCategory[] = [
  "magick",
  "format",
  "mark",
];

export type BlockKind =
  // magick
  | "ritual-step"
  | "sensation"
  | "gematria"
  | "calendar-stamp"
  | "sigil"
  | "entity-ref"
  | "divination-result"
  | "vox-magicae"
  | "chart"
  | "voice-recording"
  | "correspondence"
  // format
  | "heading"
  | "paragraph"
  | "list"
  | "quote"
  | "code"
  // mark
  | "greek"
  | "hebrew"
  | "latin"
  | "sanskrit";

export interface BlockKindMeta {
  label: string;
  category: BlockCategory;
  /** SVG path `d` strings rendered into a 24×24 viewBox. Array =
   *  multiple paths. The component renders each with stroke styling. */
  glyphPaths: string[];
}

export const BLOCK_CATALOG: Record<BlockKind, BlockKindMeta> = {
  // Magickal
  "ritual-step": {
    label: "Ritual step",
    category: "magick",
    glyphPaths: [
      "M5 6h3l2 12h6l2-9",
      "M9 6h11",
      "M12 21a1 1 0 100-2 1 1 0 000 2",
    ],
  },
  sensation: {
    label: "Body sensation",
    category: "magick",
    glyphPaths: [
      "M12 4.5a2 2 0 100 0",
      "M12 7v8M12 9l-4 2M12 9l4 2M12 15l-3 5M12 15l3 5",
    ],
  },
  gematria: {
    label: "Gematria",
    category: "magick",
    glyphPaths: ["M6 4h8l-8 16h12", "M6 4l4 8"],
  },
  "calendar-stamp": {
    label: "Calendar stamp",
    category: "magick",
    glyphPaths: ["M5 5h14v15H5z", "M5 9h14M9 3v4M15 3v4"],
  },
  sigil: {
    label: "Sigil",
    category: "magick",
    glyphPaths: ["M12 3l8 14H4zM12 3v14M4 17l8-7M20 17l-8-7"],
  },
  "entity-ref": {
    label: "Entity reference",
    category: "magick",
    glyphPaths: [
      "M12 12a4 4 0 100-8 4 4 0 000 8z",
      "M5 20c1-4 4-6 7-6s6 2 7 6",
    ],
  },
  "divination-result": {
    label: "Divination result",
    category: "magick",
    glyphPaths: [
      "M3 12c3-5 15-5 18 0-3 5-15 5-18 0z",
      "M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    ],
  },
  "vox-magicae": {
    label: "Vox magicae",
    category: "magick",
    glyphPaths: ["M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"],
  },
  chart: {
    label: "Astrological chart",
    category: "magick",
    glyphPaths: [
      "M12 21a9 9 0 100-18 9 9 0 000 18z",
      "M12 3v18M3 12h18M6 6l12 12M18 6L6 18",
    ],
  },
  "voice-recording": {
    label: "Voice recording",
    category: "magick",
    glyphPaths: [
      "M12 4a3 3 0 013 3v5a3 3 0 01-6 0V7a3 3 0 013-3z",
      "M6 11a6 6 0 0012 0M12 17v3",
    ],
  },
  correspondence: {
    label: "Correspondence",
    category: "magick",
    glyphPaths: ["M4 5h16v14H4z", "M4 9h16M9 9v10"],
  },
  // Formatting
  heading: {
    label: "Heading",
    category: "format",
    glyphPaths: ["M6 5v14M16 5v14M6 12h10"],
  },
  paragraph: {
    label: "Paragraph",
    category: "format",
    glyphPaths: ["M8 5h9M5 12h12M5 19h9"],
  },
  list: {
    label: "List",
    category: "format",
    glyphPaths: ["M5 6h.01M5 12h.01M5 18h.01", "M9 6h11M9 12h11M9 18h11"],
  },
  quote: {
    label: "Quotation",
    category: "format",
    glyphPaths: [
      "M8 11H5a3 3 0 013-5M16 11h-3a3 3 0 013-5M8 11v3a3 3 0 01-3 3M16 11v3a3 3 0 01-3 3",
    ],
  },
  code: {
    label: "Code",
    category: "format",
    glyphPaths: ["M8 6l-5 6 5 6M16 6l5 6-5 6"],
  },
  // Inline marks (polytonic Greek + Hebrew + Latin + Sanskrit script flags)
  greek: {
    label: "Greek (πολυτονικό)",
    category: "mark",
    glyphPaths: [
      "M7 19c0-3 2-5 5-5s5 2 5 5M12 14c-2-2-3-4-3-6a3 3 0 016 0c0 2-1 4-3 6",
    ],
  },
  hebrew: {
    label: "Hebrew (עברית)",
    category: "mark",
    glyphPaths: [
      "M6 5v14M6 5c5 0 7 3 7 7M18 19V8M18 19c-3 0-4-2-4-4",
    ],
  },
  latin: {
    label: "Latin",
    category: "mark",
    glyphPaths: ["M5 5l4 14M13 5L9 19M9 5h8M8 12h6"],
  },
  sanskrit: {
    label: "Sanskrit (संस्कृत)",
    category: "mark",
    glyphPaths: ["M5 6h12M9 6v9a3 3 0 006 0M15 11c2 0 3 2 3 4"],
  },
};

/**
 * Block-kinds grouped by category in the canonical order they appear
 * in the palette. Convenience for surface composition.
 */
export function blockKindsByCategory(
  category: BlockCategory,
): { kind: BlockKind; meta: BlockKindMeta }[] {
  return (Object.keys(BLOCK_CATALOG) as BlockKind[])
    .filter((k) => BLOCK_CATALOG[k].category === category)
    .map((kind) => ({ kind, meta: BLOCK_CATALOG[kind] }));
}

/**
 * Canonical template-variable tokens the user can insert into a block's
 * `default` field. Each token resolves at render time on the entry.
 */
export interface TemplateTokenMeta {
  token: string;
  description: string;
}

export const TEMPLATE_TOKENS: TemplateTokenMeta[] = [
  { token: "{date}", description: "The entry date, in the user’s calendars" },
  {
    token: "{transition}",
    description: "Current lunar / planetary transition",
  },
  { token: "{entity}", description: "The bound entity’s name" },
  { token: "{moon}", description: "Current moon phase" },
  { token: "{planetary-hour}", description: "The ruling planetary hour" },
];
