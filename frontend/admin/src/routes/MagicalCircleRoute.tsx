/**
 * Magical Circle — admin route wrapping the shared
 * MagicalCircleSurface. Phase 07 backend is unbuilt by design; the
 * Save handler Toasts until /api/v1/circles ships.
 */

import {
  MagicalCircleSurface,
  Toast,
  type CirclePreset,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function MagicalCircleRoute() {
  useTopbar(
    () => ({
      title: "Magical Circle",
      subtitle: "Concentric rings · compass points · centre element",
    }),
    [],
  );

  const handleSave = useCallback(
    (payload: {
      name: string;
      diameterMeters: number;
    }) => {
      Toast.push({
        tone: "success",
        title: "Circle saved",
        body: `“${payload.name}” committed at ${payload.diameterMeters.toFixed(1)}m. (Backend wiring for /api/v1/circles lands in a follow-up batch.)`,
      });
    },
    [],
  );

  const handleLoadPreset = useCallback((preset: CirclePreset) => {
    Toast.push({
      tone: "info",
      title: `Loaded preset · ${preset.name}`,
      body: "A mutable copy — no back-link to the source.",
    });
  }, []);

  return (
    <MagicalCircleSurface
      onSave={handleSave}
      onLoadPreset={handleLoadPreset}
    />
  );
}
