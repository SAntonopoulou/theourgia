/**
 * Entry-stats data hook.
 *
 * Wraps the API client's ``getEntryStats`` in ``useApiCall`` so Today's
 * Stat tiles get loading / error / refresh out of the box.
 */

import { type EntryStats, useApiCall } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export function useTodayStats() {
  return useApiCall<EntryStats>((signal) => apiMethods.getEntryStats({ signal }));
}

/**
 * Compute a percent delta from last week → this week.
 *   - both 0 → 0
 *   - last 0, this > 0 → +100
 *   - otherwise the rounded ratio
 */
export function weekOverWeekDelta(thisWeek: number, lastWeek: number): number {
  if (thisWeek === 0 && lastWeek === 0) return 0;
  if (lastWeek === 0) return 100;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10;
}
