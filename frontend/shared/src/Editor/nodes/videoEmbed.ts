/**
 * Video URL / ID normaliser — pure functions, no React.
 *
 * b108-2hx · FEATURES §17 (video integration) — YouTube.
 * v1-013 · FEATURES §13 — self-hosted-friendly providers: Cloudflare
 * Stream + Mux join YouTube as embed providers. No upload pipeline in
 * v1 — bring your own provider dashboard; the block embeds by URL/ID.
 *
 * YouTube handles the URL shapes YouTube emits + the ID directly:
 *
 *   https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   https://youtu.be/XXXXXXXXXXX
 *   https://www.youtube.com/embed/XXXXXXXXXXX
 *   https://www.youtube.com/shorts/XXXXXXXXXXX
 *   https://m.youtube.com/watch?v=XXXXXXXXXXX
 *   XXXXXXXXXXX
 *
 * IDs are 11 characters, [A-Za-z0-9_-]. Anything else returns null.
 *
 * All YouTube embeds render through youtube-nocookie.com (the
 * "privacy-enhanced" host) so YouTube can't set tracking cookies
 * until the viewer actually clicks play. See `extractVideoRef` for
 * the Cloudflare Stream + Mux URL shapes.
 */

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare 11-char ID
  if (ID_PATTERN.test(trimmed)) return trimmed;

  // URL — parse defensively; malformed URLs return null.
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const first = segments[0];
    if (first && ID_PATTERN.test(first)) return first;
    return null;
  }

  if (
    host === "youtube.com"
    || host === "youtube-nocookie.com"
  ) {
    // watch?v=ID
    const paramId = url.searchParams.get("v");
    if (paramId && ID_PATTERN.test(paramId)) return paramId;

    // /embed/ID | /shorts/ID | /v/ID
    const first = segments[0] ?? "";
    const second = segments[1] ?? "";
    if (
      (first === "embed" || first === "shorts" || first === "v")
      && ID_PATTERN.test(second)
    ) {
      return second;
    }
  }

  return null;
}

/**
 * Build the privacy-enhanced embed URL for a given YouTube ID.
 *
 * @param id - 11-char YouTube ID
 * @param opts.startSeconds - jump to a specific time
 * @param opts.autoplay - default false (we NEVER autoplay by default;
 *   FEATURES §17 privacy — visitors decide when to play)
 */
export function youtubeEmbedUrl(
  id: string,
  opts: { startSeconds?: number; autoplay?: boolean } = {},
): string {
  const params = new URLSearchParams();
  params.set("rel", "0");        // don't show unrelated videos at end
  params.set("modestbranding", "1");
  if (opts.startSeconds && opts.startSeconds > 0) {
    params.set("start", String(Math.floor(opts.startSeconds)));
  }
  if (opts.autoplay) {
    params.set("autoplay", "1");
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

// ── Multi-provider support (v1-013) ───────────────────────────────

export type VideoProvider = "youtube" | "cloudflare-stream" | "mux";

export interface VideoRef {
  provider: VideoProvider;
  id: string;
}

/** Plain display labels — shown in the provider select. */
export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: "YouTube",
  "cloudflare-stream": "Cloudflare Stream",
  mux: "Mux",
};

/** Per-provider placeholder for the URL/ID input. */
export const VIDEO_URL_PLACEHOLDERS: Record<VideoProvider, string> = {
  youtube: "Paste a YouTube URL or 11-char video ID",
  "cloudflare-stream": "Paste a Cloudflare Stream URL or 32-hex video ID",
  mux: "Paste a Mux player or stream URL, or a playback ID",
};

// Cloudflare Stream video IDs are 32 lowercase hex characters.
const CLOUDFLARE_ID_PATTERN = /^[0-9a-f]{32}$/;

// Mux playback IDs are long URL-safe alphanumeric strings (typically
// 30+ characters). 16 is a conservative floor that still rejects
// YouTube IDs (11 chars) and casual garbage.
const MUX_ID_PATTERN = /^[A-Za-z0-9]{16,128}$/;

export function isValidVideoId(provider: VideoProvider, id: string): boolean {
  if (typeof id !== "string" || !id) return false;
  if (provider === "youtube") return ID_PATTERN.test(id);
  if (provider === "cloudflare-stream") return CLOUDFLARE_ID_PATTERN.test(id);
  return MUX_ID_PATTERN.test(id);
}

/**
 * Superset of `extractYoutubeId` covering all three embed providers.
 *
 * URL shapes are self-identifying, so a pasted URL always resolves
 * to its own provider regardless of the pre-selected `provider`.
 * Bare IDs carry no provider signal and only resolve against the
 * pre-selected provider:
 *
 *   youtube            XXXXXXXXXXX                       (11 chars)
 *   cloudflare-stream  5d5bc37ffcf54c9b82e996823bffbb81  (32 hex)
 *   mux                DS00Spx1CV902MCtPj5WknGlR102V...  (playback ID)
 *
 * Recognised URL shapes (besides the YouTube set above):
 *
 *   https://customer-<code>.cloudflarestream.com/<id>/watch
 *   https://customer-<code>.cloudflarestream.com/<id>/iframe
 *   https://iframe.videodelivery.net/<id>
 *   https://stream.mux.com/<playback_id>.m3u8
 *   https://player.mux.com/<playback_id>
 */
export function extractVideoRef(
  input: string,
  provider: VideoProvider = "youtube",
): VideoRef | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare ID (no scheme) — resolve against the pre-selected provider.
  if (!/^https?:\/\//i.test(trimmed)) {
    return isValidVideoId(provider, trimmed)
      ? { provider, id: trimmed }
      : null;
  }

  // YouTube URL shapes — delegate so b108-2hx behavior stays exact.
  const youtubeId = extractYoutubeId(trimmed);
  if (youtubeId) return { provider: "youtube", id: youtubeId };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  // Cloudflare Stream — the customer subdomain or the iframe host.
  if (
    /^customer-[a-z0-9]+\.cloudflarestream\.com$/i.test(host)
    && CLOUDFLARE_ID_PATTERN.test(first)
    && (segments.length === 1 || second === "watch" || second === "iframe")
  ) {
    return { provider: "cloudflare-stream", id: first };
  }
  if (
    host === "iframe.videodelivery.net"
    && CLOUDFLARE_ID_PATTERN.test(first)
  ) {
    return { provider: "cloudflare-stream", id: first };
  }

  // Mux — the HLS URL (stream.mux.com/<id>.m3u8) or the hosted player.
  if (host === "stream.mux.com" && first.endsWith(".m3u8")) {
    const id = first.slice(0, -".m3u8".length);
    if (MUX_ID_PATTERN.test(id)) return { provider: "mux", id };
  }
  if (host === "player.mux.com" && MUX_ID_PATTERN.test(first)) {
    return { provider: "mux", id: first };
  }

  return null;
}

/**
 * Build the embed URL for any provider.
 *
 * Chapter-seek query params per provider (each documented by the
 * vendor for its embed host):
 *
 *   youtube            ?start=<seconds>       (youtube-nocookie.com)
 *   cloudflare-stream  ?startTime=<seconds>   (iframe.videodelivery.net)
 *   mux                ?start-time=<seconds>  (player.mux.com — hosted
 *                      player forwards query params to Mux Player
 *                      attributes, whose seek attribute is start-time)
 *
 * NEVER autoplays — this function has no autoplay code path for any
 * provider (FEATURES §17 privacy: visitors decide when to play).
 */
export function videoEmbedUrl(
  ref: VideoRef,
  opts: { startSeconds?: number } = {},
): string {
  const start = opts.startSeconds && opts.startSeconds > 0
    ? Math.floor(opts.startSeconds)
    : 0;
  if (ref.provider === "cloudflare-stream") {
    const params = new URLSearchParams();
    if (start > 0) params.set("startTime", String(start));
    const qs = params.toString();
    return `https://iframe.videodelivery.net/${ref.id}${qs ? `?${qs}` : ""}`;
  }
  if (ref.provider === "mux") {
    const params = new URLSearchParams();
    if (start > 0) params.set("start-time", String(start));
    const qs = params.toString();
    return `https://player.mux.com/${ref.id}${qs ? `?${qs}` : ""}`;
  }
  return youtubeEmbedUrl(ref.id, { startSeconds: start });
}

/**
 * Resolve persisted node attrs to a provider + ID pair.
 *
 * Back-compat: b108-2hx nodes predate `provider` / `video_id` and
 * carry the ID in `youtube_id` only — they resolve as YouTube. IDs
 * that don't match the provider's pattern resolve to null so no
 * renderer ever builds an iframe src from junk.
 */
export function videoRefFromAttrs(attrs: {
  provider?: unknown;
  video_id?: unknown;
  youtube_id?: unknown;
}): VideoRef | null {
  const provider: VideoProvider =
    attrs.provider === "cloudflare-stream" || attrs.provider === "mux"
      ? attrs.provider
      : "youtube";
  const id =
    typeof attrs.video_id === "string" && attrs.video_id
      ? attrs.video_id
      : typeof attrs.youtube_id === "string"
        ? attrs.youtube_id
        : "";
  if (!isValidVideoId(provider, id)) return null;
  return { provider, id };
}

/**
 * A single chapter marker on a video (title + start seconds).
 */
export interface VideoChapter {
  title: string;
  start_seconds: number;
}

/**
 * Node attributes persisted in Tiptap JSON. Separate from the pure
 * ID/URL helpers so both can be tested + serialised independently.
 */
export interface VideoEmbedAttrs {
  provider: VideoProvider;
  /** Provider-scoped video / playback ID (v1-013). */
  video_id: string;
  /**
   * Legacy b108-2hx field — kept populated for YouTube nodes so
   * pre-v1-013 documents and renderers keep working. Empty for the
   * other providers.
   */
  youtube_id: string;
  title: string;
  caption: string;
  captions_url: string;         // .vtt file (optional)
  chapters: VideoChapter[];     // may be empty
}

export function makeDefaultVideoEmbedAttrs(): VideoEmbedAttrs {
  return {
    provider: "youtube",
    video_id: "",
    youtube_id: "",
    title: "",
    caption: "",
    captions_url: "",
    chapters: [],
  };
}

/**
 * Parse the "chapters" textarea input the Editor UI collects.
 *
 * Input format: one chapter per line, ``mm:ss <title>`` OR
 * ``h:mm:ss <title>`` OR ``ss <title>`` (bare seconds).
 * Lines without a valid timestamp are skipped silently.
 *
 * Example:
 *
 *     0:00 Introduction
 *     2:15 The first sigil
 *     15:42 Closing
 *
 * → [{title: "Introduction", start_seconds: 0}, ...]
 */
export function parseChaptersInput(raw: string): VideoChapter[] {
  if (typeof raw !== "string") return [];
  const out: VideoChapter[] = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(
      /^(\d{1,2}(?::\d{1,2}){0,2})\s+(.+)$/,
    );
    if (!match) continue;
    const [, ts, title] = match;
    const parts = ts!.split(":").map((p) => parseInt(p, 10));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) continue;
    let seconds = 0;
    if (parts.length === 1) seconds = parts[0]!;
    else if (parts.length === 2) seconds = parts[0]! * 60 + parts[1]!;
    else seconds = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    out.push({ title: title!.trim(), start_seconds: seconds });
  }
  return out;
}

/**
 * Format a chapter list back into the textarea representation. Used
 * so an already-populated node can be edited without losing data.
 */
export function chaptersToInput(chapters: VideoChapter[]): string {
  return chapters
    .map((c) => {
      const s = Math.max(0, Math.floor(c.start_seconds));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s - h * 3600) / 60);
      const sec = s - h * 3600 - m * 60;
      const ts = h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
        : `${m}:${String(sec).padStart(2, "0")}`;
      return `${ts} ${c.title}`;
    })
    .join("\n");
}
