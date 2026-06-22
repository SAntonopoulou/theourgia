/**
 * Pendulum engine — port of the verbatim mockup engine from
 * `Theourgia Divination Misc.dc.html` (H04 handoff).
 *
 * Pendulum calibration is **per-session** — the swing meaning can
 * shift day to day, and the surface explicitly asks the practitioner
 * to set "which swing means what before you ask" (line 110). The
 * engine encodes that contract: calibrate first, then answer.
 */

export type PendulumAnswer = "Yes" | "No" | "Maybe" | "Unclear";

/**
 * Per-session calibration. Each swing direction maps to its meaning
 * for this session.
 */
export interface PendulumCalibration {
  /** Description of the swing that means yes (e.g. "swings along the body"). */
  yes: string;
  /** Description of the swing that means no (e.g. "swings across"). */
  no: string;
  /** Description of the swing that means maybe (e.g. "circles, or stays still"). */
  maybe: string;
}

/** Default calibration matching the mockup's example (line 323). */
export const DEFAULT_PENDULUM_CALIBRATION: PendulumCalibration = {
  yes: "swings along the body",
  no: "swings across",
  maybe: "circles, or stays still",
};

/** Canonical answer set in display order. */
export const PENDULUM_ANSWERS: readonly PendulumAnswer[] = [
  "Yes",
  "No",
  "Maybe",
  "Unclear",
];

/**
 * Pick a pendulum answer given the per-session calibration and a
 * random source. Even probability across {Yes, No, Maybe, Unclear} —
 * the calibration carries the *meaning* of each swing, not the odds.
 *
 * The calibration parameter is required even when unused for output
 * because the *act* of calibrating is part of the rite (the surface
 * gates the Ask affordance behind it).
 */
export function pendulumAnswer(
  _calibration: PendulumCalibration,
  random: () => number = Math.random,
): PendulumAnswer {
  const i = Math.floor(random() * PENDULUM_ANSWERS.length);
  // Clamp to defend against random() === 1 producing index = length.
  const safe = Math.min(i, PENDULUM_ANSWERS.length - 1);
  return PENDULUM_ANSWERS[safe]!;
}
