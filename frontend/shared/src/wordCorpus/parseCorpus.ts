/**
 * Read a gematria word-corpus — the words and their precomputed values — so the
 * web can answer "what else comes to N".
 *
 * These corpora are the one pack kind too large to read on the main thread (the
 * Greek Diorisis is 442,272 forms). So this file holds only the *pure* parse and
 * index functions; a Web Worker drives them off-thread (see the admin app's
 * corpus worker), and this is what the tests exercise.
 *
 * ## The shape on disk
 *
 * An `.mbf` for a corpus carries a tiny metadata payload (id, name, system, the
 * conventions, and the *name* of the entries file) plus the entries themselves
 * in a separate zip member — small ones as JSON (`[word, translit, gloss, count,
 * ...values]`), large ones as TSV with the same columns, one value column per
 * convention. The value is precomputed, so "comes to N" is a lookup, not a sum.
 */

export interface CorpusRow {
  word: string;
  /** The dictionary form, where the corpus carries one. */
  translit: string;
  gloss: string;
  /** How often the form is attested. */
  count: number;
  /** One value per convention, in the order [conventions] lists them. */
  values: number[];
}

export interface CorpusMeta {
  id: string;
  name: string;
  /** The numeration system — `greek-milesian`, `hebrew`. */
  system: string;
  /** The value schemes carried, e.g. ["default/default", "default/dropped"]. */
  conventions: string[];
  /** The zip member holding the entries — `.json` (small) or `.txt` (large). */
  entriesAsset: string;
}

/** Whether a feed pack is a gematria word-corpus, by its id namespace. */
export function isWordCorpusPack(pack: { id: string }): boolean {
  return pack.id.includes(".words.");
}

/** The metadata item from a `gematria-word-lists` payload, or null. */
export function parseCorpusMeta(payload: unknown): CorpusMeta | null {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const item = items[0] as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : null;
  const entriesAsset = typeof item.entries_asset === "string" ? item.entries_asset : null;
  if (id === null || entriesAsset === null) return null;
  const conventions = Array.isArray(item.conventions)
    ? item.conventions.filter((c): c is string => typeof c === "string")
    : [];
  return {
    id,
    name: typeof item.name === "string" ? item.name : id,
    system: typeof item.system === "string" ? item.system : "",
    conventions: conventions.length > 0 ? conventions : ["default/default"],
    entriesAsset,
  };
}

function rowFromColumns(cols: readonly string[]): CorpusRow | null {
  if (cols.length < 5) return null;
  const word = cols[0] ?? "";
  if (word === "") return null;
  return {
    word,
    translit: cols[1] ?? "",
    gloss: cols[2] ?? "",
    count: Number(cols[3] ?? "0") || 0,
    values: cols.slice(4).map((v) => Number(v) || 0),
  };
}

/**
 * Parse the entries file into rows. Format is chosen by the asset's extension
 * — `.json` for a small array-of-arrays, TSV otherwise — with a sniff fallback
 * so a mislabelled name still reads.
 */
export function parseEntries(entriesAsset: string, text: string): CorpusRow[] {
  const looksJson = entriesAsset.endsWith(".json") || text.trimStart().startsWith("[");
  if (looksJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const rows: CorpusRow[] = [];
    for (const entry of parsed) {
      if (!Array.isArray(entry)) continue;
      const row = rowFromColumns(entry.map((v) => (v == null ? "" : String(v))));
      if (row !== null) rows.push(row);
    }
    return rows;
  }

  const rows: CorpusRow[] = [];
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const row = rowFromColumns(line.split("\t"));
    if (row !== null) rows.push(row);
  }
  return rows;
}

/** Index rows by their value under one convention, for repeated lookups. */
export function indexByValue(
  rows: readonly CorpusRow[],
  conventionIndex: number,
): Map<number, CorpusRow[]> {
  const index = new Map<number, CorpusRow[]>();
  for (const row of rows) {
    const value = row.values[conventionIndex];
    if (value === undefined) continue;
    const bucket = index.get(value);
    if (bucket === undefined) index.set(value, [row]);
    else bucket.push(row);
  }
  return index;
}

export interface ValueMatches {
  value: number;
  /** The matching rows, most-attested first, capped at [limit]. */
  rows: CorpusRow[];
  /** How many matched in all, before the cap. */
  total: number;
  truncated: boolean;
}

/** Every word that comes to [value] under one convention, most-attested first. */
export function wordsForValue(
  index: Map<number, CorpusRow[]>,
  value: number,
  limit = 500,
): ValueMatches {
  const all = index.get(value) ?? [];
  const sorted = [...all].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return {
    value,
    rows: sorted.slice(0, limit),
    total: sorted.length,
    truncated: sorted.length > limit,
  };
}
