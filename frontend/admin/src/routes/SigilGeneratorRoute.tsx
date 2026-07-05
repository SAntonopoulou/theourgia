/**
 * Sigil Generator — admin route wrapping the shared
 * SigilGeneratorSurface. Save commits to `POST /api/v1/sigils`
 * (B108-2). When the API client runs in mock mode, the request
 * is resolved by the in-memory fixture handler.
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
  type SigilModeWire,
  type SigilPurpose,
  type SigilPurposeWire,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

/**
 * The frontend uses short purpose keys (draft / study) while the
 * backend enum has domain-verbose ones (workshop_draft / personal_study).
 * Map at the wire boundary; do NOT cast — casts hide 422s.
 */
const PURPOSE_MAP: Record<SigilPurpose, SigilPurposeWire> = {
  draft: "workshop_draft",
  consecrated: "consecrated",
  gift: "gift",
  study: "personal_study",
};

const MODE_MAP: Record<SigilMode, SigilModeWire> = {
  spare: "spare",
  kamea: "kamea",
  rose: "rose_cross",
  rosette: "pythagorean",
  hebrew: "hebrew",
  greek: "greek",
  hashed: "hashed",
  harmonograph: "harmonograph",
  formula: "formula",
  freeform: "freeform",
  image: "image",
};

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
    async (payload: {
      title: string;
      purpose: SigilPurpose;
      mode: SigilMode;
      intention: string;
      svg: string;
      parameters: Record<string, unknown>;
      seed: string | null;
    }) => {
      try {
        const sigil = await apiMethods.createSigil({
          title: payload.title,
          intention: payload.intention,
          mode: MODE_MAP[payload.mode],
          parameters: payload.parameters,
          svg: payload.svg,
          seed: payload.seed,
          purpose: PURPOSE_MAP[payload.purpose],
        });
        Toast.push({
          tone: "success",
          title: "Charged & committed",
          body: `“${sigil.title}” saved to your vault.`,
        });
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save",
          body:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        });
      }
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
