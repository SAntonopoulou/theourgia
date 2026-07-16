import { describe, expect, it } from "vitest";

import {
  type VideoProvider,
  chaptersToInput,
  extractVideoRef,
  extractYoutubeId,
  parseChaptersInput,
  videoEmbedUrl,
  videoRefFromAttrs,
  youtubeEmbedUrl,
} from "./videoEmbed.js";

const YT_ID = "dQw4w9WgXcQ";
const CF_ID = "5d5bc37ffcf54c9b82e996823bffbb81";
const MUX_ID = "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe";

// ── ID / URL normalisation ────────────────────────────────────────

describe("extractYoutubeId", () => {
  it("returns a bare 11-char ID as-is", () => {
    expect(extractYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a canonical youtube.com/watch URL", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a youtu.be short URL", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from a /embed/ URL", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a /shorts/ URL", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from an m.youtube.com URL", () => {
    expect(
      extractYoutubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a youtube-nocookie.com URL", () => {
    expect(
      extractYoutubeId(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      ),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for a bare 10-char string", () => {
    expect(extractYoutubeId("dQw4w9WgXc")).toBeNull();
  });

  it("returns null for a bare 12-char string", () => {
    expect(extractYoutubeId("dQw4w9WgXcQ1")).toBeNull();
  });

  it("returns null for a non-YouTube URL", () => {
    expect(
      extractYoutubeId("https://vimeo.com/dQw4w9WgXcQ"),
    ).toBeNull();
  });

  it("returns null for gibberish", () => {
    expect(extractYoutubeId("not a url or an id")).toBeNull();
  });

  it("returns null for empty string / non-string input", () => {
    expect(extractYoutubeId("")).toBeNull();
    // @ts-expect-error runtime robustness
    expect(extractYoutubeId(null)).toBeNull();
    // @ts-expect-error runtime robustness
    expect(extractYoutubeId(undefined)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(
      extractYoutubeId("   https://youtu.be/dQw4w9WgXcQ   "),
    ).toBe("dQw4w9WgXcQ");
  });

  it("ignores a valid v= parameter's non-11-char value", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/watch?v=short"),
    ).toBeNull();
  });
});

// ── Embed URL construction ────────────────────────────────────────

describe("youtubeEmbedUrl", () => {
  it("uses the privacy-enhanced youtube-nocookie.com host", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ");
    expect(url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("adds rel=0 and modestbranding=1 by default", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ");
    expect(url).toContain("rel=0");
    expect(url).toContain("modestbranding=1");
  });

  it("does NOT autoplay by default (privacy honesty rule)", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ");
    expect(url).not.toContain("autoplay=1");
  });

  it("adds start param when startSeconds > 0", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { startSeconds: 135 });
    expect(url).toContain("start=135");
  });

  it("omits start param when startSeconds is 0", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { startSeconds: 0 });
    expect(url).not.toContain("start=");
  });

  it("floors fractional startSeconds", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { startSeconds: 42.7 });
    expect(url).toContain("start=42");
  });

  it("adds autoplay only when explicitly requested", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { autoplay: true });
    expect(url).toContain("autoplay=1");
  });
});

// ── Multi-provider parsing (v1-013) ───────────────────────────────

describe("extractVideoRef — YouTube (b108-2hx parity)", () => {
  const shapes = [
    YT_ID,
    `https://www.youtube.com/watch?v=${YT_ID}`,
    `https://youtu.be/${YT_ID}`,
    `https://www.youtube.com/embed/${YT_ID}`,
    `https://www.youtube.com/shorts/${YT_ID}`,
    `https://m.youtube.com/watch?v=${YT_ID}`,
    `https://www.youtube-nocookie.com/embed/${YT_ID}`,
  ];

  it("matches extractYoutubeId for every b108-2hx URL shape", () => {
    for (const input of shapes) {
      expect(extractVideoRef(input)).toEqual({
        provider: "youtube",
        id: extractYoutubeId(input),
      });
    }
  });

  it("YouTube URLs self-identify even when another provider is pre-selected", () => {
    expect(
      extractVideoRef(`https://youtu.be/${YT_ID}`, "mux"),
    ).toEqual({ provider: "youtube", id: YT_ID });
    expect(
      extractVideoRef(`https://www.youtube.com/watch?v=${YT_ID}`, "cloudflare-stream"),
    ).toEqual({ provider: "youtube", id: YT_ID });
  });

  it("a bare 11-char ID only resolves when YouTube is pre-selected", () => {
    expect(extractVideoRef(YT_ID)).toEqual({ provider: "youtube", id: YT_ID });
    expect(extractVideoRef(YT_ID, "youtube")).toEqual({ provider: "youtube", id: YT_ID });
    expect(extractVideoRef(YT_ID, "cloudflare-stream")).toBeNull();
    expect(extractVideoRef(YT_ID, "mux")).toBeNull();
  });
});

describe("extractVideoRef — Cloudflare Stream", () => {
  it("extracts from a customer-subdomain /watch URL", () => {
    expect(
      extractVideoRef(
        `https://customer-f33zs165nr7gyfy4.cloudflarestream.com/${CF_ID}/watch`,
      ),
    ).toEqual({ provider: "cloudflare-stream", id: CF_ID });
  });

  it("extracts from a customer-subdomain /iframe URL", () => {
    expect(
      extractVideoRef(
        `https://customer-f33zs165nr7gyfy4.cloudflarestream.com/${CF_ID}/iframe`,
      ),
    ).toEqual({ provider: "cloudflare-stream", id: CF_ID });
  });

  it("extracts from an iframe.videodelivery.net URL", () => {
    expect(
      extractVideoRef(`https://iframe.videodelivery.net/${CF_ID}`),
    ).toEqual({ provider: "cloudflare-stream", id: CF_ID });
  });

  it("Cloudflare URLs self-identify regardless of the pre-selected provider", () => {
    expect(
      extractVideoRef(`https://iframe.videodelivery.net/${CF_ID}`, "youtube"),
    ).toEqual({ provider: "cloudflare-stream", id: CF_ID });
  });

  it("accepts a bare 32-hex ID only when Cloudflare Stream is pre-selected", () => {
    expect(extractVideoRef(CF_ID, "cloudflare-stream")).toEqual({
      provider: "cloudflare-stream",
      id: CF_ID,
    });
    expect(extractVideoRef(CF_ID)).toBeNull();
    expect(extractVideoRef(CF_ID, "youtube")).toBeNull();
  });

  it("rejects a 31-hex ID (bare + URL)", () => {
    const short = CF_ID.slice(0, 31);
    expect(extractVideoRef(short, "cloudflare-stream")).toBeNull();
    expect(
      extractVideoRef(`https://iframe.videodelivery.net/${short}`),
    ).toBeNull();
  });

  it("rejects uppercase hex", () => {
    expect(
      extractVideoRef(CF_ID.toUpperCase(), "cloudflare-stream"),
    ).toBeNull();
  });

  it("rejects a customer-subdomain URL with a junk path", () => {
    expect(
      extractVideoRef(
        "https://customer-f33zs165nr7gyfy4.cloudflarestream.com/not-an-id/watch",
      ),
    ).toBeNull();
    expect(
      extractVideoRef(
        `https://customer-f33zs165nr7gyfy4.cloudflarestream.com/${CF_ID}/manifest`,
      ),
    ).toBeNull();
  });
});

describe("extractVideoRef — Mux", () => {
  it("extracts from a stream.mux.com HLS URL", () => {
    expect(
      extractVideoRef(`https://stream.mux.com/${MUX_ID}.m3u8`),
    ).toEqual({ provider: "mux", id: MUX_ID });
  });

  it("extracts from a player.mux.com URL", () => {
    expect(extractVideoRef(`https://player.mux.com/${MUX_ID}`)).toEqual({
      provider: "mux",
      id: MUX_ID,
    });
  });

  it("Mux URLs self-identify regardless of the pre-selected provider", () => {
    expect(
      extractVideoRef(`https://player.mux.com/${MUX_ID}`, "youtube"),
    ).toEqual({ provider: "mux", id: MUX_ID });
  });

  it("accepts a bare playback ID only when Mux is pre-selected", () => {
    expect(extractVideoRef(MUX_ID, "mux")).toEqual({
      provider: "mux",
      id: MUX_ID,
    });
    expect(extractVideoRef(MUX_ID)).toBeNull();
    expect(extractVideoRef(MUX_ID, "cloudflare-stream")).toBeNull();
  });

  it("rejects a stream.mux.com URL without the .m3u8 suffix", () => {
    expect(extractVideoRef(`https://stream.mux.com/${MUX_ID}`)).toBeNull();
  });

  it("rejects a short bare ID even with Mux pre-selected", () => {
    expect(extractVideoRef("tooShort123", "mux")).toBeNull();
  });

  it("rejects a playback ID with URL-unsafe characters", () => {
    expect(
      extractVideoRef("DS00Spx1CV902MCtPj5Wk!GlR102V5HFkDe", "mux"),
    ).toBeNull();
  });
});

describe("extractVideoRef — garbage", () => {
  const providers: VideoProvider[] = ["youtube", "cloudflare-stream", "mux"];

  it("returns null for gibberish, empties, and foreign hosts on every provider", () => {
    for (const provider of providers) {
      expect(extractVideoRef("", provider)).toBeNull();
      expect(extractVideoRef("not a url or an id", provider)).toBeNull();
      expect(
        extractVideoRef("https://vimeo.com/123456789", provider),
      ).toBeNull();
      expect(
        extractVideoRef(`https://example.com/${CF_ID}`, provider),
      ).toBeNull();
      // @ts-expect-error runtime robustness
      expect(extractVideoRef(null, provider)).toBeNull();
      // @ts-expect-error runtime robustness
      expect(extractVideoRef(undefined, provider)).toBeNull();
    }
  });
});

// ── Multi-provider embed URLs (v1-013) ────────────────────────────

describe("videoEmbedUrl — per provider", () => {
  it("youtube dispatches to the privacy-enhanced youtubeEmbedUrl", () => {
    expect(videoEmbedUrl({ provider: "youtube", id: YT_ID })).toBe(
      youtubeEmbedUrl(YT_ID),
    );
    expect(
      videoEmbedUrl({ provider: "youtube", id: YT_ID }, { startSeconds: 135 }),
    ).toContain("start=135");
  });

  it("cloudflare-stream embeds through iframe.videodelivery.net with no default params", () => {
    expect(videoEmbedUrl({ provider: "cloudflare-stream", id: CF_ID })).toBe(
      `https://iframe.videodelivery.net/${CF_ID}`,
    );
  });

  it("cloudflare-stream seeks via ?startTime= (documented iframe param)", () => {
    expect(
      videoEmbedUrl(
        { provider: "cloudflare-stream", id: CF_ID },
        { startSeconds: 135 },
      ),
    ).toBe(`https://iframe.videodelivery.net/${CF_ID}?startTime=135`);
  });

  it("mux embeds through player.mux.com with no default params", () => {
    expect(videoEmbedUrl({ provider: "mux", id: MUX_ID })).toBe(
      `https://player.mux.com/${MUX_ID}`,
    );
  });

  it("mux seeks via ?start-time= (Mux Player attribute forwarded as a query param)", () => {
    expect(
      videoEmbedUrl({ provider: "mux", id: MUX_ID }, { startSeconds: 135 }),
    ).toBe(`https://player.mux.com/${MUX_ID}?start-time=135`);
  });

  it("floors fractional startSeconds and omits the param at 0 for every provider", () => {
    const refs = [
      { provider: "youtube" as const, id: YT_ID },
      { provider: "cloudflare-stream" as const, id: CF_ID },
      { provider: "mux" as const, id: MUX_ID },
    ];
    for (const ref of refs) {
      expect(videoEmbedUrl(ref, { startSeconds: 42.7 })).toContain("42");
      expect(videoEmbedUrl(ref, { startSeconds: 0 })).not.toMatch(
        /start(Time|-time)?=/i,
      );
    }
  });

  it("NEVER autoplays for any provider (regression — FEATURES §17 privacy)", () => {
    const refs = [
      { provider: "youtube" as const, id: YT_ID },
      { provider: "cloudflare-stream" as const, id: CF_ID },
      { provider: "mux" as const, id: MUX_ID },
    ];
    for (const ref of refs) {
      expect(videoEmbedUrl(ref)).not.toMatch(/autoplay/i);
      expect(videoEmbedUrl(ref, { startSeconds: 135 })).not.toMatch(
        /autoplay/i,
      );
    }
  });
});

// ── Attrs → ref resolution + back-compat (v1-013) ─────────────────

describe("videoRefFromAttrs", () => {
  it("resolves legacy b108-2hx attrs (youtube_id only, no provider) as YouTube", () => {
    expect(videoRefFromAttrs({ youtube_id: YT_ID })).toEqual({
      provider: "youtube",
      id: YT_ID,
    });
  });

  it("resolves provider + video_id attrs", () => {
    expect(
      videoRefFromAttrs({ provider: "cloudflare-stream", video_id: CF_ID }),
    ).toEqual({ provider: "cloudflare-stream", id: CF_ID });
    expect(videoRefFromAttrs({ provider: "mux", video_id: MUX_ID })).toEqual({
      provider: "mux",
      id: MUX_ID,
    });
  });

  it("prefers video_id over the legacy youtube_id", () => {
    expect(
      videoRefFromAttrs({
        provider: "youtube",
        video_id: YT_ID,
        youtube_id: "aaaaaaaaaaa",
      }),
    ).toEqual({ provider: "youtube", id: YT_ID });
  });

  it("returns null when the ID doesn't match the provider's pattern", () => {
    expect(videoRefFromAttrs({ provider: "mux", video_id: YT_ID })).toBeNull();
    expect(
      videoRefFromAttrs({ provider: "cloudflare-stream", video_id: YT_ID }),
    ).toBeNull();
    expect(
      videoRefFromAttrs({ provider: "youtube", video_id: CF_ID }),
    ).toBeNull();
  });

  it("returns null for empty attrs", () => {
    expect(videoRefFromAttrs({})).toBeNull();
    expect(videoRefFromAttrs({ provider: "mux" })).toBeNull();
  });

  it("treats an unknown provider value as YouTube (defensive default)", () => {
    expect(videoRefFromAttrs({ provider: "vimeo", youtube_id: YT_ID })).toEqual(
      { provider: "youtube", id: YT_ID },
    );
  });
});

// ── Chapters parsing ──────────────────────────────────────────────

describe("parseChaptersInput", () => {
  it("parses mm:ss format", () => {
    expect(parseChaptersInput("2:15 The first sigil")).toEqual([
      { title: "The first sigil", start_seconds: 135 },
    ]);
  });

  it("parses bare seconds format", () => {
    expect(parseChaptersInput("30 Half-minute check")).toEqual([
      { title: "Half-minute check", start_seconds: 30 },
    ]);
  });

  it("parses h:mm:ss format", () => {
    expect(parseChaptersInput("1:15:42 Late in the piece")).toEqual([
      { title: "Late in the piece", start_seconds: 4542 },
    ]);
  });

  it("parses multiple lines", () => {
    const input = "0:00 Intro\n2:15 Main\n15:42 Outro";
    expect(parseChaptersInput(input)).toEqual([
      { title: "Intro", start_seconds: 0 },
      { title: "Main", start_seconds: 135 },
      { title: "Outro", start_seconds: 942 },
    ]);
  });

  it("skips lines without a valid timestamp", () => {
    const input = "0:00 Intro\nnot a chapter\n2:15 Main";
    expect(parseChaptersInput(input)).toEqual([
      { title: "Intro", start_seconds: 0 },
      { title: "Main", start_seconds: 135 },
    ]);
  });

  it("handles CRLF line endings", () => {
    const input = "0:00 A\r\n2:15 B";
    expect(parseChaptersInput(input)).toHaveLength(2);
  });

  it("returns [] for empty / non-string input", () => {
    expect(parseChaptersInput("")).toEqual([]);
    // @ts-expect-error runtime robustness
    expect(parseChaptersInput(null)).toEqual([]);
  });
});

// ── Chapters round-trip ───────────────────────────────────────────

describe("chaptersToInput", () => {
  it("formats mm:ss for sub-hour timestamps", () => {
    expect(
      chaptersToInput([
        { title: "Intro", start_seconds: 0 },
        { title: "Main", start_seconds: 135 },
      ]),
    ).toBe("0:00 Intro\n2:15 Main");
  });

  it("formats h:mm:ss for over-hour timestamps", () => {
    expect(
      chaptersToInput([
        { title: "Late", start_seconds: 4542 },
      ]),
    ).toBe("1:15:42 Late");
  });

  it("round-trips through parse → format → parse", () => {
    const original = "0:00 Intro\n2:15 The sigil\n15:42 Outro";
    const parsed = parseChaptersInput(original);
    const reformatted = chaptersToInput(parsed);
    const parsedAgain = parseChaptersInput(reformatted);
    expect(parsedAgain).toEqual(parsed);
  });

  it("clamps negative seconds to zero", () => {
    expect(chaptersToInput([{ title: "x", start_seconds: -5 }])).toBe(
      "0:00 x",
    );
  });
});
