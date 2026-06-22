/**
 * Library — shared types, statuses, and tradition→spine-color mapping.
 *
 * Per `Theourgia Library.dc.html`. The three load-bearing axes:
 *   - Status: owned · reading · read · want · lent_out · unlisted
 *     (uses `--st-*` tokens; lent_out is the only "warm" status, NOT red)
 *   - Tradition: primary · grimoire · scholarship · periodical · thelemic
 *     (drives spine color via `--c-*` palette)
 *   - Language: ISO 639 codes — caller supplies labels.
 */

export type BookStatus =
  | "owned"
  | "reading"
  | "read"
  | "want"
  | "lent_out"
  | "unlisted";

export interface BookStatusMeta {
  label: string;
  /** Token-resolved color for the badge ink. */
  color: string;
}

export const BOOK_STATUS_META: Record<BookStatus, BookStatusMeta> = {
  owned: { label: "Owned", color: "var(--st-owned)" },
  reading: { label: "Reading", color: "var(--st-reading)" },
  read: { label: "Read", color: "var(--st-read)" },
  want: { label: "Want", color: "var(--st-want)" },
  lent_out: { label: "Lent out", color: "var(--st-lent)" },
  unlisted: { label: "Unlisted", color: "var(--st-unlisted)" },
};

export const BOOK_STATUS_ORDER: BookStatus[] = [
  "owned",
  "reading",
  "read",
  "want",
  "lent_out",
  "unlisted",
];

export type LibraryTradition =
  | "primary"
  | "grimoire"
  | "scholarship"
  | "periodical"
  | "thelemic";

export function traditionSpineColor(tradition: LibraryTradition): string {
  switch (tradition) {
    case "primary":
      return "var(--c-entity)";
    case "grimoire":
      return "var(--c-working)";
    case "scholarship":
      return "var(--c-divination)";
    case "periodical":
      return "var(--c-synchronicity)";
    case "thelemic":
      return "var(--accent)";
  }
}

export type BookHolding = "physical" | "digital" | "none";

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  year: number;
  publisher?: string;
  isbn?: string;
  tradition: LibraryTradition;
  /** Human-facing tradition label ("Hermetica", "Astral magic"). */
  traditionLabel: string;
  /** ISO 639 language codes — `grc`, `en`, `la`, `he`, `ar`, `cop`, `sa`. */
  languages: string[];
  status: BookStatus;
  holding: BookHolding;
  /** Shelf reference, e.g. "II·3" or "—". */
  shelf?: string;
  /** Citation count (how many entries reference this work). */
  citations: number;
  /** Single glyph rendered on the spine. */
  glyph: string;
}

export interface LibraryQuote {
  id: string;
  /** Reference to the book id. */
  bookId: string;
  /** The quotation text in its original language. */
  text: string;
  /** Citation line — "The Chaldean Oracles, fr. 1". */
  cite: string;
  /** Page or locator ("p. 47", "—"). */
  page?: string;
  /** ISO 639 code for the `lang` attribute. */
  lang: string;
  /** Human-facing language label ("Greek"). */
  langLabel: string;
  /** Reusable citation key the surface can copy ("[[cite:chaldean-fr1]]"). */
  citationKey: string;
}

export interface ReadingListSummary {
  id: string;
  name: string;
  published: boolean;
  /** Total books in the list. */
  total: number;
  /** Books that have been read. */
  read: number;
  /** Books currently reading. */
  reading: number;
  /** Free-text progress line (caller supplies — varies by surface). */
  progressLabel?: string;
}

/** 0..1 read-progress for a reading list. */
export function readingListProgress(list: ReadingListSummary): number {
  if (list.total <= 0) return 0;
  return Math.max(0, Math.min(1, list.read / list.total));
}
