/**
 * The pack feed client — the web half of the phone's rss_pack_feed.dart.
 *
 * theourgia.com/packs/feed.xml lists every published pack as an RSS item with
 * a `.mbf` enclosure — the same artifact the phone installs. Nothing on the
 * web read it before; this parses the feed and fetches a pack's bytes so the
 * site can install exactly what the phone installs (one source, not two).
 *
 * The feed is our own controlled format, so it is parsed by pattern rather than
 * a full XML stack — robust everywhere, no DOM dependency in shared code.
 */

export interface FeedPack {
  id: string;
  version: number;
  title: string;
  description: string;
  mbfUrl: string;
  bytes: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, "&"); // last, so a literal &amp;lt; is not double-decoded
}

function field(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  const raw = m?.[1];
  return raw !== undefined ? decodeEntities(raw.trim()) : "";
}

/** Parse a packs feed.xml into its packs. Malformed items are skipped. */
export function parsePackFeed(xml: string): FeedPack[] {
  const packs: FeedPack[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1] ?? "";
    const id = field(block, "pack:id");
    const enclosure = block.match(/<enclosure\s+([^>]*?)\/?>/);
    const attrs = enclosure?.[1] ?? "";
    const url = attrs.match(/url="([^"]+)"/)?.[1] ?? "";
    if (!id || !url) continue;
    packs.push({
      id,
      version: Number(field(block, "pack:version")) || 1,
      title: field(block, "title"),
      description: field(block, "description"),
      mbfUrl: url,
      bytes: Number(attrs.match(/length="(\d+)"/)?.[1] ?? 0),
    });
  }
  return packs;
}

/** Fetch and parse the feed. [base] is the packs root (default same-origin). */
export async function fetchPackFeed(base = "/packs"): Promise<FeedPack[]> {
  const res = await fetch(`${base}/feed.xml`, {
    headers: { Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) throw new Error(`Could not reach the pack feed (${res.status})`);
  return parsePackFeed(await res.text());
}

/**
 * Fetch a pack's `.mbf` as a File, ready to hand to `bundlesImport` — the same
 * bytes the phone installs, imported through the existing upload endpoint.
 */
export async function fetchPackMbf(pack: FeedPack): Promise<File> {
  const res = await fetch(pack.mbfUrl);
  if (!res.ok) throw new Error(`Could not fetch ${pack.title} (${res.status})`);
  const blob = await res.blob();
  const name = pack.mbfUrl.split("/").pop() ?? `${pack.id}.mbf`;
  return new File([blob], name, { type: "application/x-mbf" });
}
