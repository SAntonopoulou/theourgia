/**
 * Astragaloi face mechanics — pure helpers for the five-knucklebone
 * oracle surface (H12 Sprint F2).
 *
 * Rule 68: a knucklebone lands on 1, 3, 4 or 6 — never 2 or 5. Sums
 * run 5–30 with 6 and 29 mechanically impossible. These invariants are
 * enforced server-side (422); the helpers here keep the entry UI from
 * ever offering an illegal face in the first place.
 */

import type { AstragaloiValenceWire, BoneFaceWire } from "../api/types.js";

/** The four legal faces, in display order. */
export const BONE_FACES: readonly BoneFaceWire[] = [1, 3, 4, 6];

/** Sums no five-bone throw can produce. */
export const IMPOSSIBLE_SUMS: ReadonlySet<number> = new Set([6, 29]);

/** One bone's entry state — a legal face, or not yet recorded. */
export type BoneEntry = BoneFaceWire | null;

export function isBoneFace(value: unknown): value is BoneFaceWire {
  return value === 1 || value === 3 || value === 4 || value === 6;
}

/** Live sum over the recorded faces (unrecorded bones contribute 0). */
export function entrySum(entry: readonly BoneEntry[]): number {
  return entry.reduce<number>((acc, f) => acc + (f ?? 0), 0);
}

/** How many of the five faces are recorded. */
export function entryFilled(entry: readonly BoneEntry[]): number {
  return entry.filter((f) => f !== null).length;
}

/** True when all five faces are recorded. */
export function entryComplete(entry: readonly BoneEntry[]): entry is readonly BoneFaceWire[] {
  return entry.length === 5 && entry.every((f) => f !== null);
}

/** An empty five-bone entry. */
export function emptyEntry(): BoneEntry[] {
  return [null, null, null, null, null];
}

export interface ValenceTone {
  /** Foreground token. */
  color: string;
  /** Soft background token. */
  soft: string;
  /** Display label (the backend's own word — never re-invented). */
  label: string;
  /** Small glyph: check / hourglass-wait / cross. */
  glyph: "check" | "wait" | "cross";
}

/**
 * Valence display tones. The corpus legend: ✓ favourable ·
 * ⏳ cautionary ("wait / not yet") · ✗ unfavourable. A refusal is
 * ``--warn``, never ``--danger`` (H12 carry-forward).
 */
export const VALENCE_TONES: Readonly<Record<AstragaloiValenceWire, ValenceTone>> = {
  favourable: {
    color: "var(--peer-ok)",
    soft: "var(--peer-ok-soft)",
    label: "favourable",
    glyph: "check",
  },
  cautionary: {
    color: "var(--ink-mute)",
    soft: "var(--gate-open-soft)",
    label: "cautionary",
    glyph: "wait",
  },
  unfavourable: {
    color: "var(--warn)",
    soft: "var(--warn-soft)",
    label: "unfavourable",
    glyph: "cross",
  },
};
