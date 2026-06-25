/**
 * Voces Library Browser — admin route wrapping the shared
 * VocesLibrarySurface (H06 §S6.4).
 *
 * Live in mock + production mode: pulls the bundled voces from
 * `GET /api/v1/voces/bundled` (already shipped in B107) and merges
 * with the practitioner's personal voces from `GET /api/v1/voces`.
 * The "Fork into my library" CTA POSTs to
 * `/api/v1/voces/fork-bundled`.
 *
 * Recording playback is queued — the B34 audio substrate ships
 * separately. Suggest-correction queues to Toast for now; the
 * review pipeline is Phase 14 (community-contribution layer).
 */

import {
  type BundledVoce,
  type VoceLibraryEntry,
  type VoceRecordWire,
  Toast,
  VocesLibrarySurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

function bundledToEntry(b: BundledVoce): VoceLibraryEntry {
  return {
    id: b.id,
    source_text: b.source_text,
    transliteration: b.transliteration,
    ipa: b.ipa,
    source_citation: b.source_citation,
    bundled: true,
    planetary_associations: b.planetary_associations,
    elemental_associations: b.elemental_associations,
    recording_count: 0,
  };
}

function personalToEntry(v: VoceRecordWire): VoceLibraryEntry {
  return {
    id: v.id,
    source_text: v.source_text,
    transliteration: v.transliteration,
    ipa: v.ipa,
    source_citation: v.source_citation,
    bundled: false,
    planetary_associations: v.planetary_associations,
    elemental_associations: v.elemental_associations,
    recording_count: v.recordings.length,
  };
}

export function VocesLibraryRoute() {
  useTopbar(
    () => ({
      title: "Voces Magicae Library",
      subtitle: "The canonical names, and the ones you've made your own",
    }),
    [],
  );

  const [voces, setVoces] = useState<VoceLibraryEntry[]>([]);

  const loadVoces = useCallback(async () => {
    try {
      const [bundled, personal] = await Promise.all([
        apiMethods.listBundledVoces(),
        apiMethods.listVoces(),
      ]);
      setVoces([
        ...bundled.map(bundledToEntry),
        ...personal.map(personalToEntry),
      ]);
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Could not load voces",
        body:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred.",
      });
    }
  }, []);

  useEffect(() => {
    void loadVoces();
  }, [loadVoces]);

  const handleFork = useCallback(
    async (bundledId: string) => {
      try {
        const row = await apiMethods.forkBundledVoce(bundledId);
        Toast.push({
          tone: "success",
          title: "Forked into your library",
          body: `“${row.name}” is now in your personal voces.`,
        });
        await loadVoces();
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not fork",
          body:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        });
      }
    },
    [loadVoces],
  );

  const handleInsertIntoDraft = useCallback((voceId: string) => {
    Toast.push({
      tone: "info",
      title: "Insert reference queued",
      body: `Editor block-insert wiring for voce ${voceId} lands with the next Tiptap voce-node batch.`,
    });
  }, []);

  const handleSuggestCorrection = useCallback(
    (payload: { reason: string; detail: string }) => {
      Toast.push({
        tone: "info",
        title: "Correction queued",
        body: `Reason: ${payload.reason}. The review pipeline ships with Phase 14 (community-contribution layer).`,
      });
    },
    [],
  );

  return (
    <VocesLibrarySurface
      voces={voces}
      onFork={handleFork}
      onInsertIntoDraft={handleInsertIntoDraft}
      onSuggestCorrection={handleSuggestCorrection}
    />
  );
}
