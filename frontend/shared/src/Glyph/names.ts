/**
 * Names of glyphs in the engraving sprite.
 *
 * The sprite ships in ``tokens/theourgia-icons.svg`` with one ``<symbol id="theo-{name}">``
 * per glyph. Adding a glyph means adding both an SVG symbol and a name here.
 *
 * Subject-glyph expansion (planetary / zodiac / decan / lunar) is a known
 * TODO per the design handoff — additions land here as they're added to the
 * sprite.
 */

export const GLYPH_NAMES = [
  "bell",
  "calendar",
  "candle",
  "compass",
  "divination",
  "entity",
  "eye",
  "feather",
  "flask",
  "hand",
  "journal",
  "key",
  "library",
  "lock",
  "moon",
  "pentacle",
  "ritual",
  "scroll",
  "shield",
  "sigil",
  "star",
  "sun",
  "trance",
] as const;

export type GlyphName = (typeof GLYPH_NAMES)[number];

/** Type guard — runtime check that an arbitrary string is a known glyph. */
export function isGlyphName(value: unknown): value is GlyphName {
  return typeof value === "string" && (GLYPH_NAMES as readonly string[]).includes(value);
}
