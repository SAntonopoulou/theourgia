/**
 * Gematria Calculator — admin route.
 *
 * Live-wired: "Save as study" POSTs to /api/v1/studies with the
 * captured input + selected cipher IDs. "Save custom cipher" POSTs
 * to /api/v1/ciphers with the mapping + citation. Editor-block
 * insertion is still surface-scoped until the Tiptap picker
 * plumbing exposes an insert-from-outside path.
 */

import {
  GematriaCalculatorSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

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
    async (payload: { input: string; cipherIds: readonly string[] }) => {
      try {
        await apiMethods.createStudy({
          name: payload.input,
          kind: "gematria_calculation",
          query: {
            input: payload.input,
            cipher_ids: [...payload.cipherIds],
          },
          visibility: "personal",
        });
        Toast.push({
          tone: "success",
          title: "Study saved",
          body: `“${payload.input}” persisted across ${payload.cipherIds.length} cipher${payload.cipherIds.length === 1 ? "" : "s"}.`,
        });
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save",
          body: err instanceof Error ? err.message : "Unexpected error.",
        });
      }
    },
    [],
  );

  const handleInsertIntoEntry = useCallback(
    (payload: { word: string; value: number }) => {
      Toast.push({
        tone: "info",
        title: "Insert queued",
        body: `“${payload.word}” = ${payload.value}. Editor block-insert plumbing is a surface-side follow-up.`,
      });
    },
    [],
  );

  const handleSaveCustomCipher = useCallback(
    async (cipher: {
      name: string;
      personal: boolean;
      language?: string;
      citation?: string;
      values?: Readonly<Record<string, number>>;
    }) => {
      try {
        // Backend deduces `personal` from source_citation:
        //   null/empty → personal=true, otherwise personal=false.
        const source_citation = cipher.personal ? null : (cipher.citation ?? null);
        const language =
          (cipher.language as
            | "greek"
            | "hebrew"
            | "english"
            | "coptic"
            | "arabic"
            | "sanskrit"
            | "custom") ?? "custom";
        await apiMethods.createCipher({
          name: cipher.name,
          language,
          mapping: cipher.values ? { ...cipher.values } : {},
          source_citation,
        });
        Toast.push({
          tone: "success",
          title: cipher.personal
            ? `“${cipher.name}” saved · marked personal`
            : `“${cipher.name}” saved with citation`,
          body: "Custom ciphers live in your vault.",
        });
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save",
          body: err instanceof Error ? err.message : "Unexpected error.",
        });
      }
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
