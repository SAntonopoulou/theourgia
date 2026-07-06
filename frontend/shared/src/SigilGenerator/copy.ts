/**
 * SigilGenerator — verbatim copy + fixtures from
 * `Theourgia Sigil Generator.dc.html` (H05).
 *
 * Per the H05 supplement §S3: the preview is the surface's centre of
 * gravity; the left rail picks the mode; the right rail carries the
 * intention. The eleven generation modes are presented in a fixed
 * order — do not re-sort.
 *
 * Citation chrome (the ‡ badge) appears on the right rail only for
 * the modes that have a public-domain source. Custom modes
 * (freeform / image / harmonograph / formula / hashed / rosette)
 * carry no citation — the source is the practitioner.
 */

export type SigilMode =
  | "spare"
  | "kamea"
  | "rose"
  | "rosette"
  | "hebrew"
  | "greek"
  | "hashed"
  | "harmonograph"
  | "formula"
  | "freeform"
  | "image";

export interface SigilModeDef {
  key: SigilMode;
  /** Numeric position in the rail (1..11). */
  num: number;
  /** Verbatim label from the .dc.html. */
  label: string;
  /** Long subtitle template appears in the topbar as
   *  `${label} · the preview is the work; charge it when it is ready`.
   *  The mode-label is the substitution; the suffix is constant. */
}

export const SIGIL_MODES: readonly SigilModeDef[] = [
  { key: "spare", num: 1, label: "Letter elimination" },
  { key: "kamea", num: 2, label: "Kamea pathing" },
  { key: "rose", num: 3, label: "Rose Cross cipher" },
  { key: "rosette", num: 4, label: "Pythagorean rosette" },
  { key: "hebrew", num: 5, label: "Hebrew letter sigil" },
  { key: "greek", num: 6, label: "Greek letter sigil" },
  { key: "hashed", num: 7, label: "Hashed-vector" },
  { key: "harmonograph", num: 8, label: "Harmonograph" },
  { key: "formula", num: 9, label: "Parametric formula" },
  { key: "freeform", num: 10, label: "Freeform draw" },
  { key: "image", num: 11, label: "Image + vectorize" },
];

export const TOPBAR_TITLE = "Sigil Generator";
/** Trailing text after the mode label in the subtitle. */
export const TOPBAR_SUBTITLE_TAIL =
  " · the preview is the work; charge it when it is ready";

export const MODE_RAIL_EYEBROW = "Generation mode";

/* ─── Center pane — config + preview + operations ───────────────── */

export const CONFIG_PLACEHOLDER_PROMPT =
  "Set an intention in the right rail to see your sigil.";
export const OPERATIONS_EYEBROW = "Operations";
export const OPERATION_RENAME = "Rename";
export const OPERATION_RESIZE = "Resize";
export const OPERATION_SIMPLIFY = "Simplify";
/** Mirror icon glyph included in label per design. */
export const OPERATION_MIRROR = "Mirror ⇋";
export const OPERATION_ROTATE = "Rotate";

/** Curated 7-colour palette for the recolor swatches. The active
 *  default is var(--accent); the other six are deliberately muted
 *  traditional pigments. */
export const RECOLOR_SWATCHES: readonly string[] = [
  "var(--ink)",
  "#0c0a08",
  "#C2554A",
  "#5E8FA8",
  "#6E8E63",
  "var(--accent)",
  "#A98AC0",
];

/* ─── Export menu ─────────────────────────────────────────────── */

export interface SigilExportFormat {
  key: "svg" | "png" | "pdf" | "dxf";
  label: string;
  hint: string | null;
  /** Glyph for the entry — only SVG carries the ✦ "vector" mark. */
  glyph: string | null;
}

export const SIGIL_EXPORT_FORMATS: readonly SigilExportFormat[] = [
  { key: "svg", label: "SVG", hint: "vector", glyph: "✦" },
  { key: "png", label: "PNG", hint: null, glyph: null },
  { key: "pdf", label: "PDF", hint: "print", glyph: null },
  { key: "dxf", label: "DXF", hint: "CNC / laser", glyph: null },
];

/* ─── Per-mode config copy ────────────────────────────────────── */

/** Mode-specific eyebrow/section labels — verbatim from the
 *  mockup's `config()` method. */
export const CONFIG_LABELS = {
  planetary_square: "Planetary square",
  gematria_cipher: "Gematria cipher",
  curve_family: "Curve family",
  salt: "Salt (optional)",
  point_count: "Point count",
  damping: "Damping",
  duration_seconds: "Duration (s)",
  parametric_formula: "Parametric formula",
  intention: "Intention",
  transliteration_assist: "Transliteration assist",
  letterform: "Letterform",
  script: "Script",
  rosette_variant: "Rosette variant",
  source_image: "Source image",
  vectorize_threshold: "Vectorise threshold",
} as const;

/** Gematria cipher pill options. Used by Kamea / Harmonograph /
 *  Formula configs — verbatim. */
export const GEMATRIA_CIPHERS: readonly string[] = [
  "Hebrew · Mispar",
  "Greek · isopsephy",
  "English Qabalah",
];

/** Curve family options for the hashed-vector mode. */
export interface SigilCurveOption {
  key: "bezier" | "rose" | "lissajous" | "polar";
  label: string;
}

export const SIGIL_CURVE_FAMILIES: readonly SigilCurveOption[] = [
  { key: "bezier", label: "Bézier" },
  { key: "rose", label: "Rose" },
  { key: "lissajous", label: "Lissajous" },
  { key: "polar", label: "Polar" },
];

export const SALT_PLACEHOLDER = "leave empty for none";

export const FORMULA_DEFAULT = "r = sin(3θ) + 0.4·cos(g·θ)";
export const FORMULA_HELP =
  "Whitelisted: sin cos sqrt pow log abs π e g θ t. Anything else is refused.";
export const FORMULA_RENDER_LABEL = "Render";

export const SPARE_TOGGLE_LABEL = "Show the vowel-stripping step";

export const HEBREW_TRANSLIT_DEFAULT = "";
export const GREEK_TRANSLIT_DEFAULT = "";

export const HEBREW_STYLES: readonly string[] = [
  "Square Ashurit",
  "Rashi",
  "Cursive",
];
export const GREEK_STYLES: readonly string[] = [
  "Uncial",
  "Majuscule",
  "Minuscule",
];

export const ROSE_SCRIPTS: readonly string[] = [
  "Hebrew",
  "Greek",
  "Latin",
  "English",
];
export const ROSETTE_VARIANTS: readonly string[] = [
  "Classical",
  "Crowley",
  "Custom",
];

export const IMAGE_CHOOSE_LABEL = "Choose image…";
export const FREEFORM_HELP =
  "No settings — the preview area is your canvas. Pen, eraser, " +
  "stroke width, and undo/redo live in the toolbar below.";

/** Planetary square picker tiles (Kamea config). Sacred order; the
 *  surface must not re-sort. */
export interface PlanetaryTile {
  key: "saturn" | "jupiter" | "mars" | "sun" | "venus" | "mercury" | "moon";
  glyph: string;
  order: number;
}

export const PLANETARY_TILES: readonly PlanetaryTile[] = [
  { key: "saturn", glyph: "♄", order: 3 },
  { key: "jupiter", glyph: "♃", order: 4 },
  { key: "mars", glyph: "♂", order: 5 },
  { key: "sun", glyph: "☉", order: 6 },
  { key: "venus", glyph: "♀", order: 7 },
  { key: "mercury", glyph: "☿", order: 8 },
  { key: "moon", glyph: "☽", order: 9 },
];

/* ─── Right rail — "What this sigil carries" ──────────────────── */

export const CARRIES_EYEBROW = "What this sigil carries";

export const INTENTION_LABEL = "Intention";
export const INTENTION_PLACEHOLDER = "State your intent…";
export const INTENTION_DEFAULT = "";

export const LINKED_BEING_LABEL = "Linked being";
export const OPTIONAL_TAG = "· optional";
export const LINKED_BEING_DEFAULT = "";
export const LINKED_BEING_GLYPH_DEFAULT = "☽";

export const LINKED_WORKING_LABEL = "Linked working";
export const LINKED_WORKING_PLACEHOLDER = "Search your entries…";

export const NOTES_LABEL = "Notes";
export const NOTES_PLACEHOLDER = "Anything to remember about the make…";

export const CHARGE_SAVE_BUTTON = "Charge & save";
export const CHARGE_SAVE_GLYPH = "✶";

/** Per-mode public-domain citation — verbatim from the mockup's
 *  `citations` table. Modes without an entry carry no citation. */
export const SIGIL_MODE_CITATIONS: Partial<Record<SigilMode, string>> = {
  spare: "Austin Osman Spare, The Book of Pleasure (Self-Love), 1913",
  kamea: "Cornelius Agrippa, De Occulta Philosophia II.22, 1531",
  rose: "Order of the Golden Dawn — the Rose Cross cipher (public domain)",
  hebrew: "Letter values after the traditional Mispar Hechrachi",
  greek: "Letter values after Greek isopsephy",
};

/* ─── Save dialog ─────────────────────────────────────────────── */

export const SAVE_DIALOG_TITLE = "Charge & save";
export const SAVE_DIALOG_PERMANENCE =
  "A saved sigil is permanent. To change it later you make a new version.";
export const SAVE_TITLE_LABEL = "Title";
export const SAVE_TITLE_DEFAULT = "";
export const SAVE_PURPOSE_LABEL = "Purpose";

export type SigilPurpose = "draft" | "consecrated" | "gift" | "study";

export interface SigilPurposeChip {
  key: SigilPurpose;
  label: string;
}

/** Purpose chips — verbatim from `purposeDefs`. */
export const SIGIL_PURPOSE_CHIPS: readonly SigilPurposeChip[] = [
  { key: "draft", label: "Workshop draft" },
  { key: "consecrated", label: "Consecrated" },
  { key: "gift", label: "Gift" },
  { key: "study", label: "Personal study" },
];

export const SAVE_LAYER_OTHER = "Layer with other sigils…";
export const SAVE_CANCEL = "Cancel";
export const SAVE_COMMIT = "Charge & commit";

/* ─── Library panel ───────────────────────────────────────────── */

export const LIBRARY_HEADER = "Your sigils";
/** Total count prefix + the rest of the help line. The count itself
 *  is supplied by the caller; this is the verbatim trailing text. */
export const LIBRARY_HELP_TAIL =
  " made · tap one to open it read-only, then “Edit a new version”.";

/** Demo library names — verbatim seed for the storybook + first-run
 *  state. Surface consumers override with the practitioner's real
 *  list when the API lands. */
export const LIBRARY_DEMO_NAMES: readonly string[] = [
  "Unseen Walk",
  "Saturn Bind",
  "Venus Draw",
  "Hermes Road",
  "Brigid Flame",
  "Threshold",
  "Quiet Mind",
  "Open Way",
  "Dark Moon",
  "Clear Sight",
  "Safe Return",
  "Steady Hand",
];

/* ─── Owned-deck overlay ──────────────────────────────────────── */

export const OWNED_DECK_TITLE = "Personal owned-deck overlay";
export const OWNED_DECK_SUB =
  "Lay a deck you own behind the preview, faint, to compose against. " +
  "Personal study only.";
export const OWNED_DECK_UPLOAD_LABEL = "Upload a deck image";
export const OWNED_DECK_OWNERSHIP_LABEL =
  "I own a physical copy of this deck";
/** Load-bearing — must remain verbatim. Honesty discipline. */
export const OWNED_DECK_WARN =
  "This overlay is for personal study only — never shareable, " +
  "never exportable. It is cleared when you reload the surface.";
export const OWNED_DECK_CANCEL = "Cancel";
export const OWNED_DECK_CONFIRM = "Lay it behind";

/* ─── Helpers ─────────────────────────────────────────────────── */

export function modeLabel(mode: SigilMode): string {
  const def = SIGIL_MODES.find((m) => m.key === mode);
  return def?.label ?? "";
}

export function modeCitation(mode: SigilMode): string | null {
  return SIGIL_MODE_CITATIONS[mode] ?? null;
}
