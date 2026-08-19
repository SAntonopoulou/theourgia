/**
 * The message protocol between the corpus Web Worker and the surface that
 * drives it. Kept in its own module so both sides share one contract.
 */

/** A matching word, trimmed of the value columns the surface does not show. */
export interface CorpusMatch {
  word: string;
  translit: string;
  gloss: string;
  count: number;
}

export type CorpusRequest =
  | { type: "load"; mbfUrl: string }
  | { type: "query"; value: number; conventionIndex: number };

export type CorpusResponse =
  | { type: "loaded"; name: string; system: string; conventions: string[]; total: number }
  | {
      type: "result";
      value: number;
      matches: CorpusMatch[];
      total: number;
      truncated: boolean;
    }
  | { type: "error"; message: string };
