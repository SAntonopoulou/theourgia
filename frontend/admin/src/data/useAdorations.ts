/**
 * Shared state for the practitioner's adoration sets.
 *
 * Sophia, 20 Aug: choose which adoration set is active (a 'Hekate' set), the
 * way the phone does — and have Today's stations take their names from it. Both
 * the management surface and Today's lunar/solar rows read from this one
 * TanStack Query cache (same pattern as `usePractices`), so activating a set
 * renames the Today stations immediately, no reload.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdorationSet, AdorationSetsResponse } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export const ADORATIONS_KEY = ["adorations", "me"] as const;

export function useAdorations(opts?: { enabled?: boolean }) {
  return useQuery<AdorationSetsResponse, Error>({
    queryKey: ADORATIONS_KEY,
    enabled: opts?.enabled ?? true,
    queryFn: ({ signal }) => apiMethods.getMyAdorations({ signal }),
  });
}

export function useSetAdorations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sets: AdorationSet[]) => apiMethods.putMyAdorations({ sets }),
    onMutate: async (sets) => {
      await qc.cancelQueries({ queryKey: ADORATIONS_KEY });
      const prev = qc.getQueryData<AdorationSetsResponse>(ADORATIONS_KEY);
      qc.setQueryData<AdorationSetsResponse>(ADORATIONS_KEY, { sets });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADORATIONS_KEY, ctx.prev);
    },
    onSuccess: (res) => qc.setQueryData(ADORATIONS_KEY, res),
  });
}

/** The active set for a body, or undefined. Used by Today to name stations. */
export function activeSetFor(
  data: AdorationSetsResponse | undefined,
  body: "lunar" | "solar",
): AdorationSet | undefined {
  return data?.sets.find((s) => s.body === body && s.active);
}
