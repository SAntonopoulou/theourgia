/**
 * Gematria Calculator — admin route wrapping the shared
 * GematriaCalculatorSurface (H06 §S6.1).
 *
 * Phase 08 backend is unbuilt by design. "Save as study" and
 * "Insert into draft" surface a Toast acknowledging the in-memory
 * commit; the live wiring (POST /api/v1/gematria/studies + Tiptap
 * editor block insertion) lands once the Phase 08 backend is
 * authored.
 */

import {
  GematriaCalculatorSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

export function GematriaCalculatorRoute() {
  useTopbar(
    () => ({
      title: "Gematria Calculator",
      subtitle:
        "The numeric value of a word, across the ciphers you choose",
    }),
    [],
  );

  const handleSaveStudy = useCallback(
    (payload: {
      input: string;
      cipherIds: readonly string[];
    }) => {
      Toast.push({
        tone: "success",
        title: "Study captured",
        body: `“${payload.input}” computed across ${payload.cipherIds.length} ciphers. Backend wiring for POST /api/v1/gematria/studies lands when Phase 08 ships.`,
      });
    },
    [],
  );

  const handleInsertIntoEntry = useCallback(
    (payload: { word: string; value: number }) => {
      Toast.push({
        tone: "info",
        title: "Insert queued",
        body: `“${payload.word}” = ${payload.value}. Editor block-insert wiring lands with Phase 08 frontend integration.`,
      });
    },
    [],
  );

  const handleSaveCustomCipher = useCallback(
    (cipher: { name: string; personal: boolean }) => {
      Toast.push({
        tone: "success",
        title: cipher.personal
          ? `“${cipher.name}” saved · marked personal`
          : `“${cipher.name}” saved with citation`,
        body: "Custom ciphers live in your vault. Sharing with the community ships with Phase 14.",
      });
    },
    [],
  );

  return (
    <GematriaCalculatorSurface
      onSaveStudy={handleSaveStudy}
      onInsertIntoEntry={handleInsertIntoEntry}
      onSaveCustomCipher={handleSaveCustomCipher}
    />
  );
}
