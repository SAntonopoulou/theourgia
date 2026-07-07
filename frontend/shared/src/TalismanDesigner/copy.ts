/**
 * TalismanDesigner — verbatim copy + fixtures from
 * `Theourgia Talisman Designer.dc.html` (H05 §E worked example).
 *
 * Four-zone composition: topbar with face tablist · 280px layer rail
 * · 600 canvas with snap guides · 340px metadata rail. Plus an
 * election picker modal and a save dialog with --seal switch.
 *
 * Per H05 §E: the talisman is a **composition of references** —
 * `squareIds` + `sigilIds[]` + inscriptions — not a flattened
 * bitmap. The name-ring uses `textPath textLength=2π·r` +
 * `lengthAdjust="spacing"` (B90 nameRingPath) so the Hebrew divine
 * name distributes evenly around the full ring.
 */

export type TalismanFace = "front" | "back";

export type TalismanLayerKind =
  | "background"
  | "border"
  | "square"
  | "sigil"
  | "inscriptions"
  | "image";

export interface TalismanLayerDef {
  key: TalismanLayerKind;
  label: string;
  /** Short summary rendered next to the layer-row name. The seed
   *  values mirror the H05 mockup state. */
  summary: string;
}

/** Layer kinds in **draw / z-order** (bottom-first). The rail
 *  renders them in REVERSE so the practitioner reads top-most last
 *  drawn at the top. Summaries here are "empty" for every layer;
 *  the surface overrides once the practitioner picks options.
 *  (Previously seeded "parchment · names of God · ♃ Jupiter · 2
 *  sigils · 2 · none" which read like a real composition already
 *  built by the user.) */
export const TALISMAN_LAYERS: readonly TalismanLayerDef[] = [
  { key: "background", label: "Background", summary: "empty" },
  { key: "border", label: "Border", summary: "empty" },
  { key: "square", label: "Magic square", summary: "empty" },
  { key: "sigil", label: "Central sigil", summary: "empty" },
  { key: "inscriptions", label: "Inscriptions", summary: "empty" },
  { key: "image", label: "Charged image", summary: "empty" },
];

/* ─── Topbar + face tabs ───────────────────────────────────────── */

export const TOPBAR_DEFAULT_NAME = "Untitled talisman";

export const FACE_TABLIST_LABEL = "Face";
export const FACE_FRONT_LABEL = "Front";
export const FACE_BACK_LABEL = "Back";

/* ─── Left rail ───────────────────────────────────────────────── */

export const LAYERS_EYEBROW_PREFIX = "Layers · ";
export const Z_ORDER_HINT = "z-order ↑";
export const MIRROR_TO_BACK = "Mirror to back";
export const MIRROR_TO_FRONT = "Mirror to front";

/* ─── Canvas footer ───────────────────────────────────────────── */

export const SNAP_GRID_LABEL = "Snap to grid";
export const SNAP_GUIDES_CAPTION =
  "Dashed guides: concentric snap at 25 · 50 · 75 · 100%";

/* ─── Right rail ──────────────────────────────────────────────── */

export const SETTINGS_EYEBROW_TAIL = " · settings";
export const THIS_TALISMAN_EYEBROW = "This talisman";

export const NAME_LABEL = "Name";
export const PURPOSE_LABEL = "Purpose";
export const PURPOSE_DEFAULT = "";

export const LINKED_ELECTION_LABEL = "Linked election";
export const LINKED_ELECTION_FOOTER =
  "A non-binding link — the talisman exists whether or not it is " +
  "finally consecrated.";
/** Preview shown when no election is linked. Rendered as an unfilled
 *  slot in --ink-mute rather than a fabricated Jupiter hour (which
 *  previously seeded every fresh talisman as if the user had already
 *  picked one). */
export const ELECTION_PREVIEW_WHEN = "No election linked yet";
export const ELECTION_PREVIEW_DETAIL = "Choose one from the Election Finder";
export const ELECTION_PREVIEW_GLYPH = "";

export const TL_LINKED_WORKING_LABEL = "Linked consecration working";
export const LINKED_WORKING_CTA = "Link a working entry…";

export const MATERIALS_LABEL = "Materials notes";
export const MATERIALS_PLACEHOLDER =
  "Tin, engraved in the day & hour of Jupiter…";
/** Empty by default — MATERIALS_PLACEHOLDER carries the example.
 *  Previously seeded with "Cast in tin; the obverse engraved, the
 *  reverse stamped." as if the practitioner had already written it. */
export const MATERIALS_DEFAULT = "";

export const SAVE_TALISMAN_BUTTON = "Save talisman";

/* ─── Election picker modal ──────────────────────────────────── */

export const ELECTION_MODAL_TITLE = "Link an election";
export const ELECTION_MODAL_SUB =
  "Search the windows you saved in the Election Finder.";
export const ELECTION_SEARCH_PLACEHOLDER = "Search elections…";

export interface ElectionRow {
  id: string;
  when: string;
  detail: string;
  glyph: string;
  /** Numeric score string, rendered in --accent mono. */
  score: string;
}

/** Real elections come from the ephemeris + Election Finder pipeline;
 *  empty here so no fabricated Jupiter windows leak into every deploy.
 *  Consumers pass `elections` on the modal to populate. */
export const DEMO_ELECTIONS: readonly ElectionRow[] = [];

/* ─── Save dialog ─────────────────────────────────────────────── */

export const TL_SAVE_DIALOG_TITLE = "Save talisman";
export const TL_SAVE_DIALOG_PERMANENCE =
  "Once consecrated, the design locks; later changes make a new version.";
export const TL_SAVE_TITLE_LABEL = "Title";

export const SEAL_SWITCH_LABEL = "Seal this talisman";
export const SEAL_HELP_OFF =
  "Off by default. Defaults on if you link an Initiation working.";
export const SEAL_HELP_ON =
  "Encrypted on this device; the server stores only ciphertext.";

export const TL_SAVE_CANCEL = "Cancel";
export const TL_SAVE_CONFIRM = "Save";

/* ─── Texture / border / square / position option sets ─────────── */

export const BACKGROUND_TEXTURES: readonly string[] = [
  "Blank",
  "Parchment",
  "Gold leaf",
  "Silver leaf",
  "Copper",
  "Wood grain",
];

export const BORDER_STYLES: readonly string[] = [
  "Names of God",
  "Greek epithets",
  "Planetary glyphs",
  "Custom",
  "Geometric",
  "None",
];

export const SQUARE_PICKER_OPTIONS: readonly string[] = [
  "♄ Saturn",
  "♃ Jupiter",
  "♂ Mars",
  "☉ Sun",
  "Custom",
];

export const SQUARE_POSITIONS: readonly string[] = [
  "Centre",
  "Top",
  "Bottom",
  "Left",
  "Right",
];

export const ADD_SIGIL_LABEL = "+ Add a sigil";
export const ADD_INSCRIPTION_LABEL = "+ Add inscription";
export const UPLOAD_IMAGE_LABEL = "Upload an image";

/** Texture-note caption shown under the Background config. */
export const BACKGROUND_TEXTURE_NOTE =
  "A visual texture only — the actual material is named in the metadata.";

/** Empty by default — the practitioner composes their own inscription.
 *  The Hebrew RTL specimen "אל אב גבור עולם" no longer leaks as a seed. */
export const BORDER_INSCRIPTION_DEFAULT = "";

/** Seed sigils for the Central-sigil layer. */
export interface SigilRef {
  id: string;
  name: string;
  /** 0..100. */
  scale: number;
}

/** Real sigil layers come from the practitioner's Sigil Studio; empty
 *  here so no "Sigil of Yophiel" specimen leaks into every deploy. */
export const DEMO_LAYER_SIGILS: readonly SigilRef[] = [];

/** Seed inscriptions for the Inscriptions layer. */
export interface InscriptionRef {
  id: string;
  text: string;
  /** "Latin" | "Hebrew" | … — script tag rendered next to the text. */
  script: string;
}

/** Empty by default — the practitioner composes their own
 *  inscriptions in-panel. No specimen "Increase · multiply" leaks
 *  into every deploy. */
export const DEMO_INSCRIPTIONS: readonly InscriptionRef[] = [];

/** Helper: build the "Layers · {face}" eyebrow string. */
export function layersEyebrow(face: TalismanFace): string {
  return `${LAYERS_EYEBROW_PREFIX}${face === "front" ? FACE_FRONT_LABEL : FACE_BACK_LABEL}`;
}

/** Helper: pick the mirror button label for the current face. */
export function mirrorLabel(face: TalismanFace): string {
  return face === "front" ? MIRROR_TO_BACK : MIRROR_TO_FRONT;
}

/** Helper: find the layer def by key (defaults to "background"). */
export function layerByKey(key: TalismanLayerKind): TalismanLayerDef {
  return TALISMAN_LAYERS.find((l) => l.key === key) ?? TALISMAN_LAYERS[0]!;
}
