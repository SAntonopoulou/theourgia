/**
 * Voces Magicae — admin route. Persists new voces via
 * POST /api/v1/voces. The H05 honesty rule (non-empty
 * source_citation) is enforced server-side; failures surface
 * as a Toast error.
 *
 * Recording capture is still queued — the B34 audio-attachment
 * substrate lands separately; once it does, the recording
 * callback becomes a real POST to
 * /api/v1/voces/{id}/recordings.
 */

import {
  type SourceScriptWire,
  Toast,
  VocesMagicaeSurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

function mapScript(uiScript: string): SourceScriptWire {
  switch (uiScript) {
    case "greek":
    case "hebrew":
    case "latin":
    case "coptic":
      return uiScript;
    default:
      // The UI's "other" maps to the backend's "custom" enum value.
      return "custom";
  }
}

function defaultName(text: string): string {
  // First non-empty line, ≤ 60 chars. The H05 surface deliberately
  // omits a name field; the admin route synthesises one so the
  // backend has a non-empty title to index by.
  const firstLine = text.split(/\r?\n/).find((s) => s.trim().length > 0) ?? "Voce";
  return firstLine.trim().slice(0, 60);
}

export function VocesMagicaeRoute() {
  useTopbar(
    () => ({
      title: "Voces Magicae",
      subtitle: "The names of power — written, sounded, and sourced",
    }),
    [],
  );

  const handleNewVoce = useCallback(
    async (payload: {
      script: string;
      text: string;
      translit: string;
      ipa: string;
      citation: string;
    }) => {
      try {
        const row = await apiMethods.createVoce({
          name: defaultName(payload.text),
          source_text: payload.text,
          source_script: mapScript(payload.script),
          transliteration: payload.translit || null,
          ipa: payload.ipa || null,
          source_citation: payload.citation,
        });
        Toast.push({
          tone: "success",
          title: `Voce saved · ${row.name}`,
          body: `Citation captured: ${row.source_citation}`,
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
