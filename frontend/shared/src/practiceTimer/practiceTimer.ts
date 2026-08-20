/**
 * Pure timing for the two self-contained practice tools — the sitting timer
 * (meditation) and the breath pacer (pranayama).
 *
 * The tools' React shells own the clock (intervals, audio, animation); this owns
 * the arithmetic, so the parts worth being sure of are tested without a timer.
 */

/** A clock as `m:ss`, or `h:mm:ss` once it passes an hour. Negatives clamp. */
export function formatClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** The four counts of a breath, in seconds. A count of 0 drops its phase. */
export interface BreathRatio {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

/** One phase of a breath cycle. */
export interface BreathPhase {
  key: "inhale" | "holdIn" | "exhale" | "holdOut";
  label: string;
  seconds: number;
}

const PHASE_LABEL: Record<BreathPhase["key"], string> = {
  inhale: "Breathe in",
  holdIn: "Hold",
  exhale: "Breathe out",
  holdOut: "Hold",
};

/**
 * The phases of one breath, in order, with zero-length counts omitted — a
 * box-breath keeps all four; a simple in/out keeps two. Negative or fractional
 * counts are floored to whole non-negative seconds.
 */
export function breathPattern(ratio: BreathRatio): BreathPhase[] {
  const order: BreathPhase["key"][] = ["inhale", "holdIn", "exhale", "holdOut"];
  const phases: BreathPhase[] = [];
  for (const key of order) {
    const seconds = Math.max(0, Math.floor(ratio[key]));
    if (seconds > 0) phases.push({ key, label: PHASE_LABEL[key], seconds });
  }
  return phases;
}

/** Seconds in one full breath. */
export function cycleSeconds(phases: readonly BreathPhase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}

/**
 * Where in a breath a given elapsed second falls: the current phase, how far
 * into it, and the seconds left in it. Elapsed is taken modulo the cycle, so it
 * loops. Returns null when there are no phases (nothing to pace).
 */
export function phaseAt(
  elapsedSeconds: number,
  phases: readonly BreathPhase[],
): { phase: BreathPhase; index: number; intoPhase: number; remaining: number } | null {
  const total = cycleSeconds(phases);
  if (total <= 0 || phases.length === 0) return null;
  let t = Math.floor(elapsedSeconds) % total;
  if (t < 0) t += total;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase) break;
    if (t < phase.seconds) {
      return { phase, index: i, intoPhase: t, remaining: phase.seconds - t };
    }
    t -= phase.seconds;
  }
  // Unreachable while total > 0, but keeps the function total.
  const last = phases[phases.length - 1];
  return last
    ? { phase: last, index: phases.length - 1, intoPhase: 0, remaining: last.seconds }
    : null;
}
