/**
 * BindRune — editorial constants for the bind-rune designer.
 *
 * v1-007 · FEATURES §4 ("Runes — … spreads incl. bind-rune
 * designer"). Spec-built against the design-system primitives — no
 * per-surface `.dc.html` exists for this surface.
 */

export const BR_TOPBAR_TITLE = "Bind-Rune Designer";
export const BR_TOPBAR_SUBTITLE = "Layer runes over a shared stave into one bound mark";

export const BR_RAIL_SET_LABEL = "Rune row";
export const BR_RAIL_EYEBROW = "Pick runes";
export const BR_RAIL_HINT = "Click a rune to add it to the composition.";

export const BR_COMPOSITION_EYEBROW = "Composition";
export const BR_COMPOSITION_EMPTY = "No runes yet — pick from the rail to begin the binding.";

export const BR_STROKE_LABEL = "Stroke";
export const BR_STAVE_TOGGLE = "Central stave";
export const BR_DOWNLOAD_SVG = "Download SVG";

export const BR_ROTATE_LABEL = "Rotate";
export const BR_MIRROR_LABEL = "Mirror";
export const BR_SCALE_LABEL = "Scale";
export const BR_OPACITY_LABEL = "Opacity";
export const BR_REMOVE_LABEL = "Remove";

/** Honest v1 method note, shown under the canvas. */
export const BR_METHOD_NOTE =
  "Composed from layered rune glyphs over a shared stave — an honest v1; monoline stroke extraction may come later.";

export const BR_CANVAS_EMPTY_LABEL = "Empty bind-rune canvas. Pick runes from the rail to begin.";

export function bindRuneCanvasLabel(names: readonly string[]): string {
  if (names.length === 0) return BR_CANVAS_EMPTY_LABEL;
  const plural = names.length === 1 ? "rune" : "runes";
  return `Bind-rune composition of ${names.length} ${plural}: ${names.join(", ")}.`;
}

/** Stroke color choices — existing design tokens only. The fallback
 *  hex mirrors each token's dark-mode value, used for standalone SVG
 *  export when getComputedStyle cannot resolve the token. */
export const BR_STROKE_OPTIONS = [
  { key: "ink", label: "Ink", token: "--ink", fallback: "#ece5d6" },
  { key: "gold", label: "Gold", token: "--accent", fallback: "#c7a24c" },
  { key: "soft", label: "Soft ink", token: "--ink-soft", fallback: "#bcb29d" },
] as const;

export type BindRuneStrokeKey = (typeof BR_STROKE_OPTIONS)[number]["key"];

/** Mirrors the `--font-rune` token value so exported SVGs render
 *  outside the app's token layer. */
export const BR_RUNE_FONT_STACK = '"Noto Sans Runic", "Noto Sans Symbols", serif';

export const BR_DOWNLOAD_FILENAME = "bind-rune.svg";
