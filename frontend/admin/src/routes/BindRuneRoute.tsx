/**
 * Bind-Rune Designer — admin route wrapping the shared
 * BindRuneDesignerSurface (v1-007 · FEATURES §4).
 *
 * Hydrates the rune-row picker from the bundled rune-set endpoints
 * (GET /api/v1/runes/sets · /api/v1/runes/sets/{id} — all five rows,
 * including the standalone Northumbrian bundle).
 *
 * No persistence: Sigil.mode is a closed Postgres enum, so saving
 * bind-runes through the sigil vault waits for a migration in a
 * later batch. The surface composes client-side and exports SVG.
 */

import {
  BindRuneDesignerSurface,
  type BindRuneSetDetail,
  type BindRuneSetSummary,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

export function BindRuneRoute() {
  useTopbar(
    () => ({
      title: "Bind-Rune Designer",
      subtitle: "Layer runes over a shared stave into one bound mark",
    }),
    [],
  );

  const loadRuneSets = useCallback(
    async () => (await apiMethods.listRuneSets()) as unknown as BindRuneSetSummary[],
    [],
  );

  const loadRuneSet = useCallback(
    async (setId: string) => (await apiMethods.getRuneSet(setId)) as unknown as BindRuneSetDetail,
    [],
  );

  return <BindRuneDesignerSurface loadRuneSets={loadRuneSets} loadRuneSet={loadRuneSet} />;
}
