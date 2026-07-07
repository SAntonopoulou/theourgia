/**
 * MagicSquares — verbatim copy + fixtures from
 * `Theourgia Magic Squares.dc.html` (H05).
 *
 * Three modes: View (planet sigil overlay + cell tooltip) · Trace
 * (click cells → polyline + "Save as sigil" hands off to B91's
 * Kamea mode) · Build (custom squares only — editable cells +
 * Order picker 3..12).
 *
 * Honesty discipline (H05 §S2.4): the seven planetary squares are
 * immutable; Build is disabled when they're active. "Save as sigil"
 * forks a new sigil row — it never mutates the square.
 */

export type MagicSquareMode = "view" | "trace" | "build";

export type SquareId =
  | "saturn"
  | "jupiter"
  | "mars"
  | "sun"
  | "venus"
  | "mercury"
  | "moon"
  | "custom";

export const MS_TOPBAR_TITLE = "Magic Squares";
export const MS_TOPBAR_SUBTITLE =
  "The seven planetary kamea, and squares of your own";

export const RAIL_PLANETARY_EYEBROW = "Seven planetary squares";
export const RAIL_CUSTOM_EYEBROW = "Your custom squares";

export const RAIL_EMPTY_CUSTOM =
  "Build a square of your own — pick an order below.";
export const RAIL_NEW_CUSTOM = "New custom square";

export const MODE_VIEW = "View";
export const MODE_TRACE = "Trace";
export const MODE_BUILD = "Build";

export const TRACE_RESET = "Reset trace";
export const TRACE_SAVE_AS_SIGIL = "Save as sigil";
export const TRACE_SAVE_GLYPH = "✦";

export const BUILD_ORDER_LABEL = "Order";
export const BUILD_SAVE_LABEL = "Save";

/** Per-planet name shown in the rail row + heading. */
export const PLANET_NAMES: Record<
  Exclude<SquareId, "custom">,
  string
> = {
  saturn: "Saturn",
  jupiter: "Jupiter",
  mars: "Mars",
  sun: "Sun",
  venus: "Venus",
  mercury: "Mercury",
  moon: "Moon",
};

/** Single citation shared by all seven (Agrippa 1531). */
export const PLANETARY_CITATION =
  "Cornelius Agrippa, De Occulta Philosophia II.22, 1531";

export const CUSTOM_NOTE =
  "Your square — the source is you; no citation is carried.";

/** Cell-info footer prefix. */
export const SELECTED_CELL_PREFIX = "cell";

/** Header magic-constant note template — the surface inserts
 *  `order N · magic constant K`. The strings are split so the K
 *  value can render with a mono-accent style. */
export const META_ORDER_PREFIX = "order ";
export const META_CONSTANT_PREFIX = " · magic constant ";

/** Fallback name shown when the surface can't match a custom square by
 *  id. Empty-vault deployments used to see "Square of binding" as if
 *  it were an existing user creation; now the fallback is a neutral
 *  "Untitled custom square" placeholder. The real vault populates the
 *  name from the /custom-squares API. */
export const DEMO_CUSTOM_NAME = "Untitled custom square";
export const DEMO_CUSTOM_ORDER = 5;
