/**
 * Talisman Designer — admin route wrapping the shared
 * TalismanDesignerSurface (H05 §E worked example).
 *
 * Phase 07 backend is unbuilt by design. The Save handler currently
 * Toasts; sealed talismans Toast the ciphertext-only promise. The
 * /api/v1/talismans endpoint + client-side encryption pipeline land
 * in a follow-up batch.
 */

import {
  TalismanDesignerSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function TalismanDesignerRoute() {
  useTopbar(
    () => ({
      title: "Talisman Designer",
      subtitle: "Compose a two-faced talisman from layered elements",
    }),
    [],
  );

  const handleSave = useCallback(
    (payload: { title: string; sealed: boolean }) => {
      Toast.push({
        tone: "success",
        title: payload.sealed ? "Sealed talisman saved" : "Talisman saved",
        body: payload.sealed
          ? `“${payload.title}” will be encrypted on this device. (Backend wiring for /api/v1/talismans + Mode B encryption lands in a follow-up batch.)`
          : `“${payload.title}” committed. (Backend wiring for /api/v1/talismans lands in a follow-up batch.)`,
      });
    },
    [],
  );

  return <TalismanDesignerSurface onSave={handleSave} />;
}
