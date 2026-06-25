/**
 * Magic Squares — admin route wrapping the shared MagicSquaresSurface.
 *
 * Save paths:
 *   • Build mode (auto-generated square) → POST /api/v1/magic-squares
 *     directly, default name "Custom order-{n} square".
 *   • **H07 Cluster A surface 3** — the CustomSquareBuilderModal lets
 *     the practitioner author cell-by-cell with a name + attribution.
 *     Replaces the warning Toast we used to surface for custom-square
 *     "Save as sigil"; with a saved custom square row, the Sigil
 *     Generator's Kamea mode can now use it.
 *   • Trace mode → fork to Sigil Generator's Kamea mode via URL.
 */

import {
  type CustomSquarePayload,
  CustomSquareBuilderModal,
  MagicSquaresSurface,
  type SquareId,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

export function MagicSquaresRoute() {
  useTopbar(
    () => ({
      title: "Magic Squares",
      subtitle: "The seven planetary kamea, and squares of your own",
    }),
    [],
  );
  const navigate = useNavigate();

  const [builderOpen, setBuilderOpen] = useState(false);

  const handleSaveAsSigil = useCallback(
    (payload: { squareId: SquareId; cellSequence: number[] }) => {
      // Planetary squares pass through unchanged. For the placeholder
      // "custom" id (no real id yet), prompt the practitioner to
      // either save the custom square first via the H07 builder, or
      // pick a planetary kamea.
      if (payload.squareId === "custom") {
        Toast.push({
          tone: "info",
          title: "Save the custom square first",
          body: "Click 'Build a magic square' to author and save your custom kamea — then the Sigil Generator can trace it.",
        });
        return;
      }
      const qs = new URLSearchParams({
        from: "square",
        square: payload.squareId,
        cells: payload.cellSequence.join(","),
      });
      Toast.push({
        tone: "success",
        title: "Forked to sigil",
        body: `Your trace (${payload.cellSequence.length} cells) is now the sigil's path.`,
      });
      navigate(`/sigils?${qs.toString()}`);
    },
    [navigate],
  );

  const handleSaveCustomSquare = useCallback(
    async (payload: { order: number; cells: number[][] }) => {
      try {
        const row = await apiMethods.createMagicSquare({
          name: `Custom order-${payload.order} square`,
          order: payload.order,
          cells: payload.cells,
        });
        Toast.push({
          tone: "success",
          title: "Square saved",
          body: row.is_magic
            ? `Order ${row.order} · magic constant ${
                (row.order * (row.order * row.order + 1)) / 2
              }.`
            : `Saved with honest is_magic=false — sums do not all align. You can refine and re-save.`,
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

  // H07 Cluster A surface 3 — cell-by-cell authoring flow.
  const handleBuilderSave = useCallback(
    async (payload: CustomSquarePayload) => {
      try {
        const row = await apiMethods.createMagicSquare({
          name: payload.name,
          order: payload.order,
          cells: payload.cells,
          attribution: payload.attribution,
        });
        Toast.push({
          tone: "success",
          title: `“${row.name}” saved`,
          body: row.is_magic
            ? `Order ${row.order} · sums all align to the magic constant.`
            : `Saved with honest is_magic=false — sums do not all align. The square sits in your vault either way.`,
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
    <>
      <MagicSquaresSurface
        onSaveAsSigil={handleSaveAsSigil}
        onSaveCustomSquare={handleSaveCustomSquare}
        onCreateCustomSquare={() => setBuilderOpen(true)}
      />
      <CustomSquareBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleBuilderSave}
      />
    </>
  );
}
