/**
 * Magic Squares — admin route wrapping the shared
 * MagicSquaresSurface. Phase 07 backend is unbuilt by design; the
 * "Save as sigil" handler currently emits a Toast and navigates to
 * the Sigil Generator (which will pre-fill the Kamea mode once
 * cross-route state ships).
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
      Toast.push({
        tone: "success",
        title: "Forked to sigil",
        body: `A new sigil draft was forked from this trace (${payload.cellSequence.length} cells). Backend wiring lands with /api/v1/sigils.`,
      });
      navigate("/sigils");
    },
    [navigate],
  );

  return <MagicSquaresSurface onSaveAsSigil={handleSaveAsSigil} />;
}
