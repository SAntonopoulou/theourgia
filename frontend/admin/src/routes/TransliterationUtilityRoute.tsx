/**
 * Transliteration Utility — admin route wrapping
 * TransliterationUtilitySurface (H06 §S7.6).
 *
 * Wires to the B113 transliteration scheme reference tables:
 *   GET /api/v1/transliteration/schemes?source_script=<...>
 *   GET /api/v1/transliteration/schemes/{slug}    (for full mapping)
 *
 * The actual transliteration runs client-side: we fetch each
 * scheme's mapping and apply it codepoint-by-codepoint to the
 * input text. The "round-trip check" stays as a Toast stand-in
 * until the client engine ships a back-transliteration step
 * (queued for a follow-up).
 */

import {
  type RoundTripStatus,
  type SchemeOutput,
  type SourceScript,
  TransliterationUtilitySurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "../data/api.js";

interface ApiSchemeSummary {
  slug: string;
  name: string;
  source_script: string;
  direction: string;
  citation: string;
  round_trip_status: string;
}

interface ApiSchemeDetail extends ApiSchemeSummary {
  mapping: Record<string, string>;
  notes: string;
}

const SCRIPTS: SourceScript[] = [
  "greek",
  "hebrew",
  "sanskrit",
  "arabic",
  "coptic",
  "latin",
];

const DEFAULT_INPUT_BY_SCRIPT: Record<SourceScript, string> = {
  greek: "ἀγαθὸς δαίμων",
  hebrew: "שלום",
  sanskrit: "अग्नि",
  arabic: "كتاب",
  coptic: "ⲁⲗⲫⲁ",
  latin: "lux",
};

function applyMapping(text: string, mapping: Record<string, string>): string {
  let out = "";
  for (const ch of text) {
    out += mapping[ch] ?? ch;
  }
  return out;
}

function normaliseStatus(raw: string): RoundTripStatus {
  if (raw === "lossless") return "lossless";
  if (raw === "lossy") return "lossy";
  return "normalises";
}

export function TransliterationUtilityRoute() {
  useTopbar(
    () => ({
      title: "Transliteration",
      subtitle: "Render one script in another — every scheme cites its authority.",
    }),
    [],
  );

  const [activeScript, setActiveScript] = useState<SourceScript>("greek");
  const [inputText, setInputText] = useState<string>(
    DEFAULT_INPUT_BY_SCRIPT.greek,
  );
  const [details, setDetails] = useState<readonly ApiSchemeDetail[]>([]);

  // Fetch schemes whenever the source script changes.
  useEffect(() => {
    let cancelled = false;

    apiClient
      .request<ApiSchemeSummary[]>(
        `/api/v1/transliteration/schemes?source_script=${activeScript}`,
        { method: "GET" },
      )
      .then(async (summaries) => {
        const fullDetails = await Promise.all(
          summaries.map((s) =>
            apiClient.request<ApiSchemeDetail>(
              `/api/v1/transliteration/schemes/${s.slug}`,
              { method: "GET" },
            ),
          ),
        );
        if (cancelled) return;
        setDetails(fullDetails);
      })
      .catch((err) => {
        if (cancelled) return;
        Toast.push({
          tone: "info",
          title: "Couldn't load schemes",
          body: String((err as Error).message ?? err),
        });
        setDetails([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeScript]);

  // Compute per-scheme output for the current input.
  const schemes: SchemeOutput[] = useMemo(
    () =>
      details.map((d) => ({
        slug: d.slug,
        name: d.name,
        citation: d.citation,
        output: applyMapping(inputText, d.mapping),
        round_trip_status: normaliseStatus(d.round_trip_status),
        loss_note:
          d.round_trip_status === "lossy"
            ? "This scheme drops some diacritic information."
            : d.round_trip_status === "normalises"
              ? null
              : null,
      })),
    [details, inputText],
  );

  const handleScriptChange = useCallback((next: SourceScript) => {
    setActiveScript(next);
    setInputText(DEFAULT_INPUT_BY_SCRIPT[next]);
  }, []);

  const handlePasteSource = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .readText()
      .then((text) => setInputText(text))
      .catch(() => {});
  }, []);

  const handleRoundTripCheck = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Round-trip",
      body: "Back-transliteration ships with the inline editor in a follow-up. The static marks reflect the scheme's published status.",
    });
  }, []);

  const handleInsertIntoDraft = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Insert paragraph",
      body: "Tiptap integration lands in a follow-up — the lang-marked paragraph is staged.",
    });
  }, []);

  const handleCopy = useCallback((slug: string, output: string) => {
    Toast.push({
      tone: "info",
      title: `Copied ${slug}`,
      body: output.length > 60 ? `${output.slice(0, 60)}…` : output,
    });
  }, []);

  return (
    <TransliterationUtilitySurface
      scripts={SCRIPTS}
      active_script={activeScript}
      input_text={inputText}
      schemes={schemes}
      onScriptChange={handleScriptChange}
      onInputChange={setInputText}
      onCopy={handleCopy}
      onRoundTripCheck={handleRoundTripCheck}
      onInsertIntoDraft={handleInsertIntoDraft}
      onPasteSource={handlePasteSource}
    />
  );
}
