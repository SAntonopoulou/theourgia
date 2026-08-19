/**
 * Unzip a corpus `.mbf` and read its words — the fflate half of the corpus
 * pipeline, kept here because fflate is a dependency of this package. Meant to
 * run inside a Web Worker: it decompresses a few megabytes into tens and parses
 * hundreds of thousands of rows, which must never touch the main thread.
 */

import { strFromU8, unzipSync } from "fflate";

import { type CorpusMeta, type CorpusRow, parseCorpusMeta, parseEntries } from "./parseCorpus.js";

export interface LoadedCorpus {
  meta: CorpusMeta;
  rows: CorpusRow[];
}

const META_PAYLOAD = "payloads/gematria-word-lists.json";

/**
 * Read the corpus out of the `.mbf` bytes, or null if the archive is not one
 * (no gematria-word-lists payload, or its entries file is missing).
 */
export function readCorpusFromMbf(bytes: Uint8Array): LoadedCorpus | null {
  const files = unzipSync(bytes);

  const metaRaw = files[META_PAYLOAD];
  if (metaRaw === undefined) return null;
  let meta: CorpusMeta | null;
  try {
    meta = parseCorpusMeta(JSON.parse(strFromU8(metaRaw)));
  } catch {
    return null;
  }
  if (meta === null) return null;

  const assetRaw = files[meta.entriesAsset];
  if (assetRaw === undefined) return null;

  const rows = parseEntries(meta.entriesAsset, strFromU8(assetRaw));
  return { meta, rows };
}
