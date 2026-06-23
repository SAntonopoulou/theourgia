/**
 * Sigil Generator — admin route wrapping the shared
 * SigilGeneratorSurface. Phase 07 backend is unbuilt by design; the
 * Save handler surfaces a Toast acknowledging the in-memory commit
 * until /api/v1/sigils lands.
 *
 * Cross-surface arrivals: when navigated from the Magic Squares
 * surface via "Save as sigil", the URL carries the source square +
 * cell-sequence so the generator opens in Kamea mode with the user's
 * exact trace. See `MagicSquaresRoute.handleSaveAsSigil`.
 */

import {
  SigilGeneratorSurface,
  type PlanetKey,
  type SigilMode,
  type SigilPurpose,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const PLANET_KEYS: PlanetKey[] = [
  "saturn",
  "jupiter",
  "mars",
  "sun",
  "venus",
  "mercury",
  "moon",
];

function parsePlanetKey(value: string | null): PlanetKey | undefined {
  if (value === null) return undefined;
  return PLANET_KEYS.includes(value as PlanetKey)
    ? (value as PlanetKey)
    : undefined;
}

function parseCellSequence(value: string | null): number[] | undefined {
  if (value === null || value.length === 0) return undefined;
  const parts = value
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parts.length > 0 ? parts : undefined;
}

export function SigilGeneratorRoute() {
  useTopbar(
    () => ({
      title: "Sigil Generator",
      subtitle: "Eleven modes — the preview is the work",
    }),
    [],
  );

  const [params] = useSearchParams();

  const cross = useMemo(() => {
    if (params.get("from") !== "square") return null;
    const square = parsePlanetKey(params.get("square"));
    const cells = parseCellSequence(params.get("cells"));
    if (square === undefined || cells === undefined) return null;
    return { square, cells };
  }, [params]);

  const handleSave = useCallback(
    (payload: {
      title: string;
      purpose: SigilPurpose;
      mode: SigilMode;
      intention: string;
    }) => {
      Toast.push({
        tone: "success",
        title: "Charged & committed",
        body: `“${payload.title}” saved. Backend wiring (POST /api/v1/sigils) lands in a follow-up batch.`,
      });
    },
    [],
  );

  return (
    <SigilGeneratorSurface
      onSave={handleSave}
      initialMode={cross !== null ? "kamea" : undefined}
      initialSquare={cross?.square}
      initialCellSequence={cross?.cells}
    />
  );
}
