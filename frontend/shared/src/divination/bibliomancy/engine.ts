/**
 * Bibliomancy engine — port of the contract from
 * `Theourgia Divination Misc.dc.html` (H04 handoff, line 331).
 *
 * The practitioner opens a chosen library text by one of three methods.
 * The picker is a thin frontend helper that, given the structured text
 * (paginated lines or numbered verses) and a method, returns the
 * passage and its citation reference. The backend stores actual book
 * texts; this engine only operates on the data it's handed.
 */

export type BibliomancyMethod = "page-finger" | "random-line" | "verse-number";

/** Method definitions verbatim from the mockup (line 331). */
export const BIBLIOMANCY_METHODS: ReadonlyArray<{
  key: BibliomancyMethod;
  label: string;
  /** One-line description shown beneath the method picker. */
  note: string;
}> = [
  {
    key: "page-finger",
    label: "Page & finger",
    note: "opened at random, finger laid on the page",
  },
  {
    key: "random-line",
    label: "Random line",
    note: "a single line chosen by lot",
  },
  {
    key: "verse-number",
    label: "By verse number",
    note: "numbered by lot, then located",
  },
];

/** Minimal book shape required by the engine. The surface composes
 *  this from the backend's full LibraryEntry. */
export interface BibliomancySource {
  /** A non-empty array of lines/verses. Caller decides what a "line"
   *  is (could be a paragraph, a stichos, a sutra, a couplet). */
  lines: readonly string[];
  /** Number of lines per page when paginated (e.g. 32 for a typical
   *  printed page). Used by the "page-finger" method. */
  linesPerPage?: number;
  /** Full citation string the picker echoes back, e.g.
   *  "The Chaldean Oracles, fr. 97". */
  citation: string;
}

export interface BibliomancyResult {
  passage: string;
  reference: string;
}

/**
 * Pick a passage from the source by the chosen method.
 *
 * - **page-finger**: random page, random line within that page (uses
 *   linesPerPage, defaulting to 32). Reference cites the page number.
 * - **random-line**: random line across the whole book.
 *   Reference cites the line number.
 * - **verse-number**: random verse across the whole book (same uniform
 *   draw as random-line; the rite is the same, the framing differs).
 *   Reference cites the verse number with a § sigil.
 */
export function bibliomancyOpen(
  source: BibliomancySource,
  method: BibliomancyMethod,
  random: () => number = Math.random,
): BibliomancyResult {
  if (source.lines.length === 0) {
    throw new Error("BibliomancySource.lines must not be empty.");
  }
  const linesPerPage = source.linesPerPage ?? 32;

  if (method === "page-finger") {
    const totalPages = Math.max(
      1,
      Math.ceil(source.lines.length / linesPerPage),
    );
    const page = Math.min(
      totalPages - 1,
      Math.floor(random() * totalPages),
    );
    const start = page * linesPerPage;
    const end = Math.min(source.lines.length, start + linesPerPage);
    const within = end - start;
    const lineOnPage = Math.min(
      within - 1,
      Math.floor(random() * within),
    );
    const lineIndex = start + lineOnPage;
    return {
      passage: source.lines[lineIndex]!,
      reference: `${source.citation}, p. ${page + 1}`,
    };
  }

  const idx = Math.min(
    source.lines.length - 1,
    Math.floor(random() * source.lines.length),
  );
  const passage = source.lines[idx]!;
  if (method === "verse-number") {
    return { passage, reference: `${source.citation}, § ${idx + 1}` };
  }
  // random-line
  return { passage, reference: `${source.citation}, l. ${idx + 1}` };
}
