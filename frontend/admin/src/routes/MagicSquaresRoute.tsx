/**
 * Magic Squares — admin route wrapping the shared
 * MagicSquaresSurface.
 *
 * Two save paths:
 *   • Build mode → POST /api/v1/magic-squares (custom square row).
 *   • Trace mode → fork to Sigil Generator's Kamea mode via URL.
 */

import {
  MagicSquaresSurface,
  type SquareId,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

export function MagicSquaresRoute() {
  useTopbar(
    () => ({
      title: "Magic Squares",
      subtitle:
        "The seven planetary kamea, and squares of your own",
    }),
    [],
  );
  const navigate = useNavigate();

  const handleSaveAsSigil = useCallback(
    (payload: { squareId: SquareId; cellSequence: number[] }) => {
      // Custom squares can't be carried over — the Sigil Generator's
      // Kamea mode is keyed on the 7 planetary squares. Surface a
      // gentle note and stay on the page rather than navigating with
      // unusable params.
      if (payload.squareId === "custom") {
        Toast.push({
          tone: "warning",
          title: "Custom-square kamea is queued",
          body: "The Sigil Generator's Kamea mode currently accepts the 7 planetary squares only. Custom kamea support ships in a follow-up batch.",
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
            : `Saved, but the rows / columns / diagonals do not all sum to the magic constant. You can refine and re-save.`,
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
    <MagicSquaresSurface
      onSaveAsSigil={handleSaveAsSigil}
      onSaveCustomSquare={handleSaveCustomSquare}
    />
  );
}
