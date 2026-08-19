/**
 * The corpus Web Worker.
 *
 * A gematria word-corpus is the one pack too large to touch the main thread
 * (the Greek Diorisis unzips to 21 MB and 442,272 rows). This worker fetches
 * the `.mbf`, decompresses and parses it, holds the rows in its own memory, and
 * answers "what comes to N" — all off the thread the page paints on. The pure
 * parse/index functions it uses are in @theourgia/shared and are unit-tested;
 * this file is only the plumbing.
 */

import { type CorpusRow, indexByValue, readCorpusFromMbf, wordsForValue } from "@theourgia/shared";

import type { CorpusRequest, CorpusResponse } from "./corpusMessages.js";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<CorpusRequest>) => void) | null;
  postMessage: (message: CorpusResponse) => void;
};

let rows: CorpusRow[] = [];
// One value-index per convention, built the first time that convention is asked.
const indexes = new Map<number, Map<number, CorpusRow[]>>();

ctx.onmessage = async (event: MessageEvent<CorpusRequest>) => {
  const msg = event.data;

  if (msg.type === "load") {
    try {
      const res = await fetch(msg.mbfUrl);
      if (!res.ok) {
        ctx.postMessage({ type: "error", message: `Couldn't fetch the corpus (${res.status}).` });
        return;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const loaded = readCorpusFromMbf(bytes);
      if (loaded === null) {
        ctx.postMessage({ type: "error", message: "That pack is not a word corpus." });
        return;
      }
      rows = loaded.rows;
      indexes.clear();
      ctx.postMessage({
        type: "loaded",
        name: loaded.meta.name,
        system: loaded.meta.system,
        conventions: loaded.meta.conventions,
        total: rows.length,
      });
    } catch (err) {
      ctx.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : "The corpus could not be read.",
      });
    }
    return;
  }

  // A value lookup.
  let index = indexes.get(msg.conventionIndex);
  if (index === undefined) {
    index = indexByValue(rows, msg.conventionIndex);
    indexes.set(msg.conventionIndex, index);
  }
  const match = wordsForValue(index, msg.value);
  ctx.postMessage({
    type: "result",
    value: match.value,
    matches: match.rows.map((r) => ({
      word: r.word,
      translit: r.translit,
      gloss: r.gloss,
      count: r.count,
    })),
    total: match.total,
    truncated: match.truncated,
  });
};
