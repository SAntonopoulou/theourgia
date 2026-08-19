/**
 * Reading a pack's content on the web, client-side — the same move the phone
 * makes locally, so the site can *use* a pack without the server materializing
 * it into a table per kind.
 *
 * An `.mbf` is a zip of JSON: `manifest.json` + `payloads/<kind>.json`. This
 * fetches a pack from the feed, unzips it in the browser, and returns the
 * payload documents keyed by kind. A surface then reads the kind it cares about
 * (a gematria system's cipher, a correspondence table, a directional frame…)
 * and merges it with what ships built in.
 *
 * Word corpora are the one exception — tens of megabytes, they would freeze the
 * tab the way they froze the phone's UI isolate. [isClientReadable] gates them
 * out; those want a server-side query API, not client unzip.
 */

import { unzipSync } from "fflate";

import type { FeedPack } from "./packFeed.js";

export interface PackPayloads {
  manifest: Record<string, unknown>;
  /** payload kind → the payload document (its shape is the kind's concern) */
  payloads: Record<string, unknown>;
}

/** Above this, a pack is a corpus — too big to unzip on the main thread. */
export const MAX_CLIENT_SIDE_BYTES = 2 * 1024 * 1024;

export function isClientReadable(pack: FeedPack): boolean {
  return pack.bytes >= 0 && pack.bytes <= MAX_CLIENT_SIDE_BYTES;
}

/** Parse `.mbf` bytes into manifest + payloads. Pure — no network. */
export function parsePackBytes(buf: Uint8Array): PackPayloads {
  const files = unzipSync(buf);
  const decoder = new TextDecoder();
  let manifest: Record<string, unknown> = {};
  const payloads: Record<string, unknown> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (path === "manifest.json") {
      manifest = JSON.parse(decoder.decode(bytes));
    } else if (path.startsWith("payloads/") && path.endsWith(".json")) {
      const kind = path.slice("payloads/".length, -".json".length);
      payloads[kind] = JSON.parse(decoder.decode(bytes));
    }
  }
  return { manifest, payloads };
}

/** Fetch a pack from the feed and read its content client-side. */
export async function fetchPackContent(pack: FeedPack): Promise<PackPayloads> {
  const res = await fetch(pack.mbfUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch ${pack.title} (${res.status})`);
  }
  return parsePackBytes(new Uint8Array(await res.arrayBuffer()));
}

/**
 * The content of every feed pack that is installed (by slug), client-readable,
 * and carries a payload of [kind]. Returns each pack beside that payload — the
 * shape a surface merges into its built-in defaults.
 *
 * Packs are matched to installed slugs on the pack id (dotted) or its
 * slug form (dashed), the two ways an .mbf names itself.
 */
export async function installedPackPayloads(
  feed: FeedPack[],
  installedSlugs: readonly string[],
  kind: string,
): Promise<{ pack: FeedPack; payload: unknown }[]> {
  const installed = new Set(installedSlugs);
  const matches = feed.filter(
    (p) => isClientReadable(p) && (installed.has(p.id) || installed.has(p.id.replaceAll(".", "-"))),
  );
  const out: { pack: FeedPack; payload: unknown }[] = [];
  for (const pack of matches) {
    try {
      const content = await fetchPackContent(pack);
      const payload = content.payloads[kind];
      if (payload !== undefined) out.push({ pack, payload });
    } catch {
      // A pack that won't read is skipped, not fatal — the others still load.
    }
  }
  return out;
}
