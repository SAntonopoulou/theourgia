/**
 * Streak math — port of `Theourgia Daily Practice Tracker.dc.html`
 * lines 332-339.
 *
 * The contract is **quiet** by design (H04 §S3.4): a streak is a
 * trailing run of "kept" days. A skip breaks the run. A `pending`
 * today does NOT break the prior run — the practitioner may still
 * mark it complete later, so we count the run ending yesterday.
 *
 * No gamification: this is information, not a reward signal.
 */

/** A single day's status in the completion history. */
export type CompletionStatus = "done" | "skip" | "miss";

/** Today's status as seen from the surface. */
export type TodayStatus = "done" | "skipped" | "pending";

/**
 * Compute the trailing streak count.
 *
 * @param history  Chronologically ordered history. The newest entry
 *                 (today) is at the END of the array. Older days come
 *                 first. Length is up to caller (35 in the mockup).
 * @param todayStatus  How the practitioner is currently treating
 *                     today. When `pending`, we count the run ending
 *                     yesterday (the day before today's slot).
 *
 * @returns The trailing run of "done" days, including today if today
 *          is done. Zero when today (or the last counted day) is not
 *          done.
 */
export function streak(
  history: readonly CompletionStatus[],
  todayStatus: TodayStatus,
): number {
  if (history.length === 0) return 0;

  // Mockup line 337: start = pending ? 33 : 34 — i.e. the second-to-
  // last index when today is still pending, otherwise the last index.
  const lastIndex = history.length - 1;
  const start = todayStatus === "pending" ? lastIndex - 1 : lastIndex;

  if (start < 0) return 0;

  let count = 0;
  for (let i = start; i >= 0; i--) {
    if (history[i] === "done") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Count how many days in the window are "kept" (status === "done").
 * The mockup renders this as "{kept} of 35 kept" beneath the streak
 * grid. Independent of the streak — `kept` is a total, `streak` is a
 * trailing run.
 */
export function countKept(history: readonly CompletionStatus[]): number {
  let n = 0;
  for (const h of history) {
    if (h === "done") n++;
  }
  return n;
}
