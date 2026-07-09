import { describe, expect, it } from "vitest";

import {
  chaptersToInput,
  extractYoutubeId,
  parseChaptersInput,
  youtubeEmbedUrl,
} from "./videoEmbed.js";

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
