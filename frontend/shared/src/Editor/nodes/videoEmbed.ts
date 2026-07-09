/**
 * YouTube URL / ID normaliser — pure functions, no React.
 *
 * b108-2hx · FEATURES §17 (video integration).
 *
 * Handles the URL shapes YouTube emits + the ID directly:
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
 * All embeds render through youtube-nocookie.com (the "privacy-
 * enhanced" host) so YouTube can't set tracking cookies until the
 * viewer actually clicks play.
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
  youtube_id: string;
  title: string;
  caption: string;
  captions_url: string;         // .vtt file (optional)
  chapters: VideoChapter[];     // may be empty
}

export function makeDefaultVideoEmbedAttrs(): VideoEmbedAttrs {
  return {
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
