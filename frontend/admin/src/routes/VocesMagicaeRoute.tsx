/**
 * Voces Magicae — admin route. Persists new voces via
 * POST /api/v1/voces. The H05 honesty rule (non-empty
 * source_citation) is enforced server-side; failures surface
 * as a Toast error.
 *
 * Live-wired: GET /api/v1/voces populates the surface. The default
 * DEMO_VOCES fixture (which shipped fake ΙΑΩ + ABRASAX + ABLANATHANALBA
 * specimens) has been replaced by the practitioner's real voces.
 *
 * Recording capture is still queued — the B34 audio-attachment
 * substrate lands separately; once it does, the recording
 * callback becomes a real POST to /api/v1/voces/{id}/recordings.
 */

import {
  type ElementalAssoc,
  type PlanetaryAssoc,
  type SourceScriptWire,
  type VoceRecord,
  type VoceRecordWire,
  type VoceTradition,
  Toast,
  VocesMagicaeSurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

function mapScript(uiScript: string): SourceScriptWire {
  switch (uiScript) {
    case "greek":
    case "hebrew":
    case "latin":
    case "coptic":
      return uiScript;
    default:
      return "custom";
  }
}

function defaultName(text: string): string {
  const firstLine = text.split(/\r?\n/).find((s) => s.trim().length > 0) ?? "Voce";
  return firstLine.trim().slice(0, 60);
}

const PLANET_KEYS: readonly PlanetaryAssoc[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];
const ELEMENT_KEYS: readonly ElementalAssoc[] = [
  "fire",
  "water",
  "air",
  "earth",
];

function scriptToTradition(script: SourceScriptWire): Exclude<VoceTradition, "all"> {
  // Best-effort tradition tag until the backend adds an explicit
  // tradition column. Coptic + Greek → PGM by default (the vast
  // majority of Greek voces come from the Papyri Graecae Magicae);
  // Hebrew leans Goetic; anything else lands in "custom".
  if (script === "greek" || script === "coptic") return "pgm";
  if (script === "hebrew") return "goetic";
  return "custom";
}

function wireToVoce(w: VoceRecordWire): VoceRecord {
  const planets = (w.planetary_associations ?? []).filter((p): p is PlanetaryAssoc =>
    (PLANET_KEYS as readonly string[]).includes(p),
  );
  const elements = (w.elemental_associations ?? []).filter((e): e is ElementalAssoc =>
    (ELEMENT_KEYS as readonly string[]).includes(e),
  );
  return {
    id: w.id,
    text: w.source_text,
    translit: w.transliteration ?? "",
    ipa: w.ipa ?? "",
    citation: w.source_citation,
    trad: scriptToTradition(w.source_script),
    builtin: false,
    planets,
    elements,
    entities: [],
    recs: [],
    workings: [],
  };
}

export function VocesMagicaeRoute() {
  useTopbar(
    () => ({
      title: "Voces Magicae",
      subtitle: "The names of power — written, sounded, and sourced",
    }),
    [],
  );

  const [voces, setVoces] = useState<VoceRecordWire[]>([]);

  const loadVoces = useCallback(async () => {
    try {
      const rows = await apiMethods.listVoces();
      setVoces(rows);
    } catch {
      // Best-effort — empty list is a fine fallback.
    }
  }, []);

  useEffect(() => {
    void loadVoces();
  }, [loadVoces]);

  const surfaceVoces = useMemo(() => voces.map(wireToVoce), [voces]);

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
        await loadVoces();
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
    [loadVoces],
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
      voces={surfaceVoces}
      onNewVoce={handleNewVoce}
      onRecordNew={handleRecordNew}
    />
  );
}
