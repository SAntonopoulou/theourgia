/**
 * Shared state for the eight built-in practice toggles.
 *
 * Sophia, 20 Aug: flipping a practice in Settings must show on Today with no
 * reload. Both surfaces used their own one-shot `useApiCall`, so neither knew
 * when the other wrote. This routes practices through the app-wide TanStack
 * Query cache (the same liveness pattern as `lib/hubs.ts`): one query key, so
 * every reader — Today, Settings, anywhere — sees the same set and re-renders
 * together the instant the toggle mutates.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PracticeToggleSettings } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export const PRACTICES_KEY = ["practices", "me"] as const;

/** The built-in-practice on/off set, from the shared cache. Pass
 *  `{ enabled: false }` when signed out (the endpoint requires auth). */
export function usePractices(opts?: { enabled?: boolean }) {
  return useQuery<PracticeToggleSettings, Error>({
    queryKey: PRACTICES_KEY,
    enabled: opts?.enabled ?? true,
    queryFn: ({ signal }) => apiMethods.getMyPractices({ signal }),
  });
}

/** Toggle the switched-off set. Optimistically updates the shared cache so
 *  every reader reflects it immediately, then reconciles from the server's
 *  authoritative response (rolling back on error). */
export function useSetPractices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { disabled: string[] }) => apiMethods.putMyPractices(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: PRACTICES_KEY });
      const prev = qc.getQueryData<PracticeToggleSettings>(PRACTICES_KEY);
      if (prev) {
        const off = new Set(input.disabled);
        qc.setQueryData<PracticeToggleSettings>(PRACTICES_KEY, {
          practices: prev.practices.map((p) => ({ ...p, enabled: !off.has(p.key) })),
        });
      }
      return { prev };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(PRACTICES_KEY, ctx.prev);
    },
    onSuccess: (res) => qc.setQueryData(PRACTICES_KEY, res),
  });
}
