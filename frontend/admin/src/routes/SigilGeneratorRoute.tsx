/**
 * Sigil Generator — admin route wrapping the shared
 * SigilGeneratorSurface. Phase 07 backend is unbuilt by design; the
 * Save handler surfaces a Toast acknowledging the in-memory commit
 * until /api/v1/sigils lands.
 */

import {
  SigilGeneratorSurface,
  type SigilMode,
  type SigilPurpose,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function SigilGeneratorRoute() {
  useTopbar(
    () => ({
      title: "Sigil Generator",
      subtitle: "Eleven modes — the preview is the work",
    }),
    [],
  );

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

  return <SigilGeneratorSurface onSave={handleSave} />;
}
