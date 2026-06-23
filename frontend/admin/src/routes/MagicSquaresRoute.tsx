/**
 * Magic Squares — admin route wrapping the shared
 * MagicSquaresSurface. Phase 07 backend is unbuilt by design; the
 * "Save as sigil" handler navigates to the Sigil Generator with the
 * source square + trace cell-sequence carried via URL params so the
 * generator opens directly in Kamea mode with the user's exact trace.
 */

import {
  MagicSquaresSurface,
  type SquareId,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

  return <MagicSquaresSurface onSaveAsSigil={handleSaveAsSigil} />;
}
