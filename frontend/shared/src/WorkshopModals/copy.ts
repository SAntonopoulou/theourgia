/**
 * Editorial copy for the Cluster-A Workshop follow-up modals
 * (H07 §S3 Cluster A): New Tool · New Altar · Custom Square Builder.
 *
 * Voice: matter-of-fact craft (same as H05). These modals close the
 * B108-2e Tool Registry follow-up and the queued B92→B91 custom-
 * kamea handoff for sigil generation.
 */

// ── Shared modal chrome ─────────────────────────────────────────────

export const WM_CANCEL_LABEL = "Cancel";

// ── New Tool modal ──────────────────────────────────────────────────

export const NT_TITLE = "New tool";
export const NT_NAME_LABEL = "Name";
export const NT_KIND_LABEL = "Kind";
export const NT_OTHER_PLACEHOLDER = "Name this kind…";
export const NT_MATERIALS_LABEL = "Materials";
export const NT_MATERIALS_PLACEHOLDER = "Add material + Enter";
export const NT_DIMENSIONS_LABEL = "Dimensions";
export const NT_DIM_LENGTH = "Length cm";
export const NT_DIM_WIDTH = "Width cm";
export const NT_DIM_HEIGHT = "Height cm";
export const NT_DIM_WEIGHT = "Weight g";
export const NT_PROVENANCE_LABEL = "Provenance";
export const NT_PROVENANCE_PLACEHOLDER = "Made, found, gifted, inherited…";
export const NT_ACQUIRED_LABEL = "Acquisition date";
export const NT_LOCATION_LABEL = "Current location";
export const NT_LOCATION_PLACEHOLDER =
  "On the working altar · in the cupboard · …";
export const NT_CONSECRATION_NOTE =
  "Consecration is recorded separately — link a working entry from the tool's detail view.";
export const NT_SAVE_LABEL = "Save to vault";

export const NT_KIND_LABELS = [
  ["athame", "Athame"],
  ["wand", "Wand"],
  ["chalice", "Chalice"],
  ["pentacle", "Pentacle"],
  ["censer", "Censer"],
  ["bell", "Bell"],
  ["sword", "Sword"],
  ["lamp", "Lamp"],
  ["mirror", "Mirror"],
  ["bowl", "Bowl"],
  ["statue", "Statue"],
  ["robe", "Robe"],
  ["cingulum", "Cingulum"],
  ["other", "Other"],
] as const;

// ── New Altar modal ─────────────────────────────────────────────────

export const NA_TITLE = "New altar";
export const NA_NAME_LABEL = "Name";
export const NA_DESCRIPTION_LABEL = "Description";
export const NA_DESCRIPTION_PLACEHOLDER =
  "What this altar is for · how it's set · who tends it…";
export const NA_PERMANENT_LABEL = "Permanent altar";
export const NA_PERMANENT_HELP =
  "Permanent altars carry forward across workings; temporary altars belong to one occasion.";
export const NA_TOOLS_LABEL = "Tools";
export const NA_TOOLS_EMPTY =
  "No tools yet — add some on the Tool Registry first.";
export const NA_DIAGRAM_LABEL = "Arrangement diagram (optional)";
export const NA_DIAGRAM_HELP =
  "Sketch from above; orient north up. SVG up to 1 MB.";
export const NA_DIAGRAM_SKIP = "Skip for now";
export const NA_LINKED_NOTE =
  "Linked workings are added from the altar's detail view.";
export const NA_SAVE_LABEL = "Save altar";

// ── Custom Square Builder modal ─────────────────────────────────────

export const CSB_TITLE = "Build a magic square";
export const CSB_NAME_LABEL = "Name";
export const CSB_ORDER_LABEL = "Order";
export const CSB_GRID_LABEL = "Cells";
export const CSB_ATTRIBUTION_LABEL = "Attribution";
export const CSB_ATTRIBUTION_HELP =
  "If this square is from a published source, cite it here.";
export const CSB_HELP_TAIL =
  "Failing sums are reported, not blocking — the square saves either way.";
export const CSB_SAVE_LABEL = "Save square";
export const CSB_ROWS_LABEL = "Rows";
export const CSB_COLS_LABEL = "Cols";
export const CSB_DIAG_LABEL = "Diagonals";

// Note: the `magicConstant(order)` helper lives in
// `../workshop/magicSquares.ts` (shipped in B92). The Custom Square
// Builder imports it from there — the sums that match it render in
// `--money` (sober affirmation); sums that don't render in
// `--ink-mute` (failing sums are REPORTED, NOT gated — the H05/H07
// honesty rule: save honestly with `is_magic: false` rather than
// block save).
