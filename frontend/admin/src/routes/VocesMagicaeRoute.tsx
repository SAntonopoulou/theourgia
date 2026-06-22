/**
 * Voces Magicae — admin route. Phase 07 backend is unbuilt; Save
 * and Record-new Toasts until the API ships.
 */

import {
  Toast,
  VocesMagicaeSurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function VocesMagicaeRoute() {
  useTopbar(
    () => ({
      title: "Voces Magicae",
      subtitle: "The names of power — written, sounded, and sourced",
    }),
    [],
  );

  const handleNewVoce = useCallback(
    (payload: { text: string; citation: string }) => {
      Toast.push({
        tone: "success",
        title: `Voce saved · ${payload.text}`,
        body: `Citation captured. (Backend wiring lands in a follow-up batch.)`,
      });
    },
    [],
  );

  const handleRecordNew = useCallback((voceId: string) => {
    Toast.push({
      tone: "info",
      title: "Recording",
      body: `Audio capture for voce ${voceId} composes the B34 audio substrate. (Wiring lands in a follow-up batch.)`,
    });
  }, []);

  return (
    <VocesMagicaeSurface
      onNewVoce={handleNewVoce}
      onRecordNew={handleRecordNew}
    />
  );
}
