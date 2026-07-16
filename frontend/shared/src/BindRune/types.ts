/**
 * BindRune — shared types for the bind-rune designer surface.
 *
 * The rune-row catalog mirrors the backend's bundled rune sets
 * (`GET /api/v1/runes/sets` · `GET /api/v1/runes/sets/{set_id}`) —
 * Elder Futhark, Younger Futhark, Anglo-Saxon Futhorc, Armanen, and
 * Northumbrian (FEATURES §4).
 */

/** One row of `GET /api/v1/runes/sets`. */
export interface BindRuneSetSummary {
  set_id: string;
  name: string;
  description: string;
  size: number;
}

/** One rune within `GET /api/v1/runes/sets/{set_id}`. */
export interface BindRuneGlyph {
  index: number;
  name: string;
  transliteration: string;
  glyph: string;
}

/** `GET /api/v1/runes/sets/{set_id}` — the summary plus its runes. */
export interface BindRuneSetDetail extends BindRuneSetSummary {
  runes: BindRuneGlyph[];
}

/** Quarter-turn rotations offered by the per-rune transform controls. */
export type BindRuneRotation = 0 | 90 | 180 | 270;

/** One rune layered onto the composition canvas. */
export interface BindRuneLayer {
  /** Stable per-layer id — the same rune may be layered twice. */
  id: string;
  setId: string;
  runeName: string;
  transliteration: string;
  glyph: string;
  rotation: BindRuneRotation;
  mirrored: boolean;
  /** Glyph scale multiplier (0.4–1.6). */
  scale: number;
  /** Layer opacity (0.2–1). */
  opacity: number;
}
