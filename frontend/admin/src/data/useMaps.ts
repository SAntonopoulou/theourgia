/**
 * Shared state for the practitioner's spiritual maps.
 *
 * A spiritual map is a named figure of nodes worked one at a time — the phone
 * keeps figures locally, so on the web the figure is *authored* here (stored as
 * a per-user setting, same slice pattern as `useAdorations`) while each node's
 * *work* is kept to the record as an observance. The management surface reads
 * from this one TanStack Query cache; editing a map writes the whole set back
 * (last-writer-wins, as the phone's sync expects).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SpiritualMap, SpiritualMapsResponse } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export const MAPS_KEY = ["maps", "me"] as const;

export function useMaps(opts?: { enabled?: boolean }) {
  return useQuery<SpiritualMapsResponse, Error>({
    queryKey: MAPS_KEY,
    enabled: opts?.enabled ?? true,
    queryFn: ({ signal }) => apiMethods.getMyMaps({ signal }),
  });
}

export function useSetMaps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (maps: SpiritualMap[]) => apiMethods.putMyMaps({ maps }),
    onMutate: async (maps) => {
      await qc.cancelQueries({ queryKey: MAPS_KEY });
      const prev = qc.getQueryData<SpiritualMapsResponse>(MAPS_KEY);
      qc.setQueryData<SpiritualMapsResponse>(MAPS_KEY, { maps });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MAPS_KEY, ctx.prev);
    },
    onSuccess: (res) => qc.setQueryData(MAPS_KEY, res),
  });
}

/** The `subjectKey` under which a node's work is kept — it must match the
 *  phone's convention so a web-kept working crosses to the phone's map. */
export function mapNodeSubjectKey(mapId: string, nodeId: string): string {
  return `map:${mapId}:${nodeId}:work`;
}
