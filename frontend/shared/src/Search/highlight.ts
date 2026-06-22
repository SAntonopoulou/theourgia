/**
 * Hit-highlight segmenter for the Search surface.
 *
 * Splits free text into runs of `{ text, hit }` where `hit=true`
 * runs case-insensitively match the query. Used by `HighlightedText`
 * but exported so callers can compute segments once and pass them
 * to multiple visual treatments (title + excerpt sharing one query).
 */

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

export function highlightSegments(
  text: string,
  query: string | undefined,
): HighlightSegment[] {
  if (!query || !query.trim()) return [{ text, hit: false }];
  const out: HighlightSegment[] = [];
  const lc = text.toLowerCase();
  const lq = query.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lc.indexOf(lq, i);
    if (at < 0) {
      out.push({ text: text.slice(i), hit: false });
      break;
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false });
    out.push({ text: text.slice(at, at + lq.length), hit: true });
    i = at + lq.length;
  }
  return out;
}
