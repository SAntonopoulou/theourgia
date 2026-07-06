/**
 * MagicalCircle — verbatim copy + fixtures from
 * `Theourgia Magical Circle.dc.html` (H05).
 *
 * Three-zone composition: rings/compass rail · live SVG preview ·
 * ring config + centre + footer. Plus a Preset Library modal (PD
 * circles loaded as mutable copies — no back-link to source).
 *
 * Compass-point traditions are single-select for the whole circle.
 * Watchtowers colour the four cardinals via --earth / --air /
 * --fire / --water; the other traditions render the cardinals in
 * plain --ink.
 *
 * --danger is unused. Saved circles are immutable (the footer line
 * states this) — Edit a new version forks (the build side honours
 * this when the API ships).
 */

export type RingKind =
  | "inscription"
  | "glyphs"
  | "image"
  | "blank"
  | "multi";

export type CompassTradition =
  | "archangels"
  | "winds"
  | "watchtowers"
  | "dikpalas"
  | "custom";

export type CentreElement =
  | "pentagram"
  | "hexagram"
  | "unicursal"
  | "solomonic"
  | "sigil"
  | "square"
  | "blank";

export const MC_TOPBAR_DEFAULT_NAME = "Circle of the Sphere of Jupiter";

export const DIAMETER_LABEL = "Diameter";
/** Default diameter in metres. */
export const DEFAULT_DIAMETER_M = 2.0;

export const OPEN_FROM_LIBRARY = "Open from library";
export const PRINT_TILE_LABEL = "Print-tile";

export const RINGS_EYEBROW = "Rings";
export const COMPASS_POINTS_EYEBROW = "Compass points";
export const COMPASS_TRADITION_NOTE =
  "One tradition for the whole circle.";

export const CENTRE_ELEMENT_EYEBROW = "Centre element";
export const RING_CONTENT_SUFFIX = " · content";
export const MC_KIND_LABEL = "Kind";

export const USED_IN_NOTE_PREFIX = "Used in ";
export const USED_IN_NOTE_TAIL = " workings · saved circles are immutable";

export const SAVE_CIRCLE_BUTTON = "Save circle";

export const LIBRARY_MODAL_TITLE = "Open from library";
export const LIBRARY_MODAL_SUB =
  "Public-domain presets. Loading one gives you a mutable copy — it does not link back to the source.";

/* ─── Ring kinds (5) ─────────────────────────────────────────── */

export interface RingKindOption {
  key: RingKind;
  label: string;
}

export const RING_KINDS: readonly RingKindOption[] = [
  { key: "inscription", label: "Inscription" },
  { key: "glyphs", label: "Glyph row" },
  { key: "image", label: "Single image" },
  { key: "blank", label: "Blank" },
  { key: "multi", label: "Multi-glyph" },
];

/** Per-kind preview text rendered next to the ring label in the
 *  rail row. Uses generic script names so no specific cultural
 *  formula leaks as the default preview. */
export const RING_KIND_PREVIEW: Record<RingKind, string> = {
  inscription: "(your inscription)",
  glyphs: "☉ ☽ ☿ ♀ ♂ ♃ ♄",
  image: "(uploaded)",
  blank: "—",
  multi: "custom sequence",
};

/* ─── Compass traditions (5) ─────────────────────────────────── */

export interface CompassDefinition {
  /** "Heading" shown in the picker option. */
  label: string;
  /** Four cardinal labels in [N, E, S, W] order. */
  cardinals: readonly [string, string, string, string];
}

export const COMPASS_DEFINITIONS: Record<
  CompassTradition,
  CompassDefinition
> = {
  archangels: {
    label: "Archangels (Hermetic)",
    cardinals: ["Uriel", "Raphael", "Michael", "Gabriel"],
  },
  winds: {
    label: "Greek wind gods",
    cardinals: ["Boreas", "Apēliōtēs", "Notos", "Zephyros"],
  },
  watchtowers: {
    label: "Four Watchtowers",
    cardinals: ["Earth", "Air", "Fire", "Water"],
  },
  dikpalas: {
    label: "Vedic dikpalas",
    cardinals: ["Kubera", "Indra", "Yama", "Varuna"],
  },
  custom: {
    label: "Custom",
    cardinals: ["North", "East", "South", "West"],
  },
};

/** Order the picker presents the 5 traditions. */
export const COMPASS_ORDER: readonly CompassTradition[] = [
  "archangels",
  "winds",
  "watchtowers",
  "dikpalas",
  "custom",
];

/* ─── Centre elements (7) ────────────────────────────────────── */

export interface CentreOption {
  key: CentreElement;
  label: string;
}

export const CENTRE_OPTIONS: readonly CentreOption[] = [
  { key: "pentagram", label: "Pentagram" },
  { key: "hexagram", label: "Hexagram" },
  { key: "unicursal", label: "Unicursal" },
  { key: "solomonic", label: "Solomonic seal" },
  { key: "sigil", label: "My sigil" },
  { key: "square", label: "Square trace" },
  { key: "blank", label: "Blank" },
];

/* ─── Library presets (5 PD circles) ─────────────────────────── */

export interface CirclePreset {
  id: string;
  name: string;
  cite: string;
}

export const LIBRARY_PRESETS: readonly CirclePreset[] = [
  {
    id: "lbrp",
    name: "LBRP banishing pentagrams",
    cite: "Golden Dawn (public domain)",
  },
  {
    id: "heptameron",
    name: "Heptameron spirit triangle",
    cite: "Pietro d’Abano, Heptameron, 1496",
  },
  {
    id: "goetic",
    name: "Goetic triangle of art",
    cite: "Lesser Key of Solomon (public domain)",
  },
  {
    id: "picatrix-jupiter",
    name: "Picatrix planetary circle — Jupiter",
    cite: "Picatrix III, c. 1050",
  },
  {
    id: "pgm",
    name: "Greek defixiones encircling pattern",
    cite: "PGM (public domain)",
  },
];

/* ─── Ring-config inputs (per kind) ──────────────────────────── */

export const INSCRIPTION_TEXT_LABEL = "Text";
export const INSCRIPTION_SCRIPT_LABEL = "Script";
export const INSCRIPTION_DIRECTION_LABEL = "Direction";
export const INSCRIPTION_DEFAULT = "";
export const INSCRIPTION_SCRIPTS: readonly string[] = [
  "Hebrew",
  "Greek",
  "Latin",
  "English",
];
export const INSCRIPTION_DIRECTIONS: readonly string[] = [
  "Clockwise",
  "Counter-clockwise",
];

export const GLYPH_SET_LABEL = "Glyph set";
export const GLYPH_SETS: readonly string[] = [
  "Planetary 7",
  "Zodiacal 12",
  "Elemental 4",
  "Decanic 36",
  "Custom",
];
export const ROTATION_LABEL = "Rotation";

export const IMAGE_KIND_LABEL = "Image";
export const IMAGE_UPLOAD_LABEL = "Upload…";

export const MULTI_SEQUENCE_LABEL = "Sequence";
/** Demo glyph sequence shown for the Multi-glyph kind. */
export const MULTI_DEMO_SEQUENCE = "☉ ☽ ♃ ♀ ☿";
export const MULTI_EDIT_LABEL = "Edit sequence…";

export const BLANK_NOTE = "A blank ring — boundary only, no content.";

/* ─── Helpers ──────────────────────────────────────────────────── */

/** Ring labels grow with the count. 1 → ["Ring"], 2 → inner/outer,
 *  3 → inner/middle/outer, 4+ → inner / Ring 2..N-1 / outer. */
export function ringLabels(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ["Ring"];
  if (count === 2) return ["Inner ring", "Outer ring"];
  if (count === 3) return ["Inner ring", "Middle ring", "Outer ring"];
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return "Inner ring";
    if (i === count - 1) return "Outer ring";
    return `Ring ${i + 1}`;
  });
}

export function ringKindLabel(kind: RingKind): string {
  return RING_KINDS.find((k) => k.key === kind)?.label ?? "Inscription";
}
