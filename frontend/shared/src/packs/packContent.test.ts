import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MAX_CLIENT_SIDE_BYTES, isClientReadable, parsePackBytes } from "./packContent.js";
import type { FeedPack } from "./packFeed.js";

function mbf(manifest: unknown, payloads: Record<string, unknown>): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest)),
  };
  for (const [kind, doc] of Object.entries(payloads)) {
    files[`payloads/${kind}.json`] = strToU8(JSON.stringify(doc));
  }
  return zipSync(files);
}

describe("parsePackBytes", () => {
  it("reads the manifest and each payload keyed by kind", () => {
    const bytes = mbf(
      { slug: "theourgia.numbers.greek", version: 2 },
      {
        "gematria-systems": { source: "Milesian", ciphers: [{ a: 1 }] },
        "gematria-word-lists": { words: [] },
      },
    );
    const { manifest, payloads } = parsePackBytes(bytes);
    expect(manifest.slug).toBe("theourgia.numbers.greek");
    expect(payloads["gematria-systems"]).toEqual({
      source: "Milesian",
      ciphers: [{ a: 1 }],
    });
    expect(Object.keys(payloads)).toContain("gematria-word-lists");
  });

  it("ignores non-payload entries", () => {
    const files: Record<string, Uint8Array> = {
      "manifest.json": strToU8("{}"),
      "signature.json": strToU8("{}"),
      "payloads/x.json": strToU8('{"ok":true}'),
    };
    const { payloads } = parsePackBytes(zipSync(files));
    expect(Object.keys(payloads)).toEqual(["x"]);
  });
});

describe("isClientReadable", () => {
  const pack = (bytes: number): FeedPack => ({
    id: "p",
    version: 1,
    title: "P",
    description: "",
    mbfUrl: "https://h/p.mbf",
    kind: "reference",
    contains: [],
    bytes,
  });

  it("passes small packs, gates out corpora", () => {
    expect(isClientReadable(pack(2869))).toBe(true);
    expect(isClientReadable(pack(MAX_CLIENT_SIDE_BYTES))).toBe(true);
    expect(isClientReadable(pack(MAX_CLIENT_SIDE_BYTES + 1))).toBe(false);
    expect(isClientReadable(pack(43_000_000))).toBe(false);
  });
});
