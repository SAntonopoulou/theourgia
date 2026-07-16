/**
 * Tiptap node — videoEmbed.
 *
 * b108-2hx · FEATURES §17 (video integration) — YouTube.
 * v1-013 · FEATURES §13 — Cloudflare Stream + Mux embed providers.
 *
 * Inline video embed rendered inside a bordered card that reads like
 * the other custom blocks (calendar-stamp, correspondence, etc.).
 * YouTube embeds go through the privacy-enhanced youtube-nocookie.com
 * host; Cloudflare Stream through iframe.videodelivery.net; Mux
 * through player.mux.com. The iframe is lazy-loaded so the embed
 * only fires network requests when the viewer actually scrolls it
 * into view — matches the honesty rule: no third-party requests
 * until the user shows they want them. No provider ever autoplays.
 *
 * Persisted attrs:
 *   - provider:    "youtube" | "cloudflare-stream" | "mux" (default
 *                  youtube — pre-v1-013 nodes render as YouTube)
 *   - video_id:    provider-scoped video / playback ID
 *   - youtube_id:  legacy b108-2hx field; still written for YouTube
 *                  nodes so older renderers keep working
 *   - title:       display title (shown above the iframe)
 *   - caption:     short editorial caption
 *   - captions_url: optional .vtt captions file for accessibility
 *   - chapters:    list of {title, start_seconds}
 *
 * The slash command inserts an empty node with all fields blank;
 * the user picks a provider and pastes a URL (or bare ID) into the
 * URL input and the node extracts the ID. Pasted URLs are
 * self-identifying, so a YouTube link pasted while "Mux" is selected
 * still lands on the YouTube provider.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useMemo, useState } from "react";

import {
  chaptersToInput,
  extractVideoRef,
  parseChaptersInput,
  videoEmbedUrl,
  videoRefFromAttrs,
  VIDEO_PROVIDER_LABELS,
  VIDEO_URL_PLACEHOLDERS,
  type VideoChapter,
  type VideoProvider,
} from "./videoEmbed.js";

const LINE = "var(--line)";

const inputBase = {
  background: "none",
  border: "none",
  outline: "none",
  color: "inherit",
  fontFamily: "inherit",
  padding: 0,
  width: "100%",
} as const;

function formatChapterTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  const sec = s - h * 3600 - m * 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Exported for tests — Tiptap mounts it via ReactNodeViewRenderer. */
export function VideoEmbedView({ node, updateAttributes, editor }: NodeViewProps) {
  const provider: VideoProvider =
    node.attrs.provider === "cloudflare-stream" || node.attrs.provider === "mux"
      ? node.attrs.provider
      : "youtube";
  const currentId: string = node.attrs.video_id || node.attrs.youtube_id || "";
  const title: string = node.attrs.title ?? "";
  const caption: string = node.attrs.caption ?? "";
  const captionsUrl: string = node.attrs.captions_url ?? "";
  const chapters: VideoChapter[] = Array.isArray(node.attrs.chapters)
    ? node.attrs.chapters
    : [];
  const editable = editor.isEditable;

  const [chaptersDraft, setChaptersDraft] = useState<string>(
    chaptersToInput(chapters),
  );
  const [startAt, setStartAt] = useState<number>(0);

  const videoRef = useMemo(() => videoRefFromAttrs(node.attrs), [node.attrs]);

  const embedSrc = useMemo(() => {
    if (!videoRef) return null;
    return videoEmbedUrl(videoRef, { startSeconds: startAt });
  }, [videoRef, startAt]);

  const commitUrlOrId = (raw: string): void => {
    const ref = extractVideoRef(raw, provider);
    if (!ref) return;
    updateAttributes({
      provider: ref.provider,
      video_id: ref.id,
      // Legacy field — pre-v1-013 renderers read youtube_id directly.
      youtube_id: ref.provider === "youtube" ? ref.id : "",
    });
  };

  const commitChapters = (draft: string): void => {
    updateAttributes({ chapters: parseChaptersInput(draft) });
  };

  return (
    <NodeViewWrapper
      data-block="video-embed"
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
        margin: "0 0 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-3)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <polygon points="10 8 16 12 10 16 10 8" fill="var(--accent)" />
          <rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Video
        </span>
        {editable ? (
          <select
            value={provider}
            onChange={(e) =>
              updateAttributes({ provider: e.target.value as VideoProvider })
            }
            aria-label="Video provider"
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              background: "var(--bg-2)",
              color: "var(--ink-soft)",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-sm)",
              padding: "2px 6px",
            }}
          >
            <option value="youtube">YouTube</option>
            <option value="cloudflare-stream">Cloudflare Stream</option>
            <option value="mux">Mux</option>
          </select>
        ) : null}
        {captionsUrl ? (
          <span
            style={{
              marginLeft: editable ? 0 : "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
            title="Captions attached"
          >
            CC
          </span>
        ) : null}
      </div>

      {/* URL input (editable mode only) */}
      {editable ? (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${LINE}` }}>
          <input
            key={provider}
            type="text"
            defaultValue={currentId}
            onBlur={(e) => commitUrlOrId(e.target.value)}
            placeholder={VIDEO_URL_PLACEHOLDERS[provider]}
            style={{
              ...inputBase,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          />
        </div>
      ) : null}

      {/* The embed. Lazy-loaded so no network calls until scrolled to. */}
      {embedSrc ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "var(--bg)",
          }}
        >
          <iframe
            src={embedSrc}
            title={title || `${VIDEO_PROVIDER_LABELS[provider]} video`}
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          {editable
            ? `Paste a ${VIDEO_PROVIDER_LABELS[provider]} URL above.`
            : "No video linked."}
        </div>
      )}

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${LINE}` }}>
        {editable ? (
          <>
            <input
              type="text"
              defaultValue={title}
              onBlur={(e) => updateAttributes({ title: e.target.value })}
              placeholder="Title"
              style={{
                ...inputBase,
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            />
            <input
              type="text"
              defaultValue={caption}
              onBlur={(e) => updateAttributes({ caption: e.target.value })}
              placeholder="Caption (optional)"
              style={{
                ...inputBase,
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                marginBottom: 8,
              }}
            />
            <input
              type="text"
              defaultValue={captionsUrl}
              onBlur={(e) => updateAttributes({ captions_url: e.target.value })}
              placeholder="Captions URL (.vtt) — optional, for accessibility"
              style={{
                ...inputBase,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginBottom: 8,
              }}
            />
            <textarea
              value={chaptersDraft}
              onChange={(e) => setChaptersDraft(e.target.value)}
              onBlur={(e) => commitChapters(e.target.value)}
              placeholder={
                "Chapters (optional). One per line — e.g.\n0:00 Introduction\n2:15 The first sigil"
              }
              rows={4}
              style={{
                ...inputBase,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                color: "var(--ink)",
                resize: "vertical",
                minHeight: 60,
              }}
            />
          </>
        ) : (
          <>
            {title ? (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {title}
              </div>
            ) : null}
            {caption ? (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink-soft)",
                  margin: 0,
                }}
              >
                {caption}
              </p>
            ) : null}
            {chapters.length > 0 ? (
              <ul
                data-role="video-chapters"
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "12px 0 0",
                  borderTop: `1px solid ${LINE}`,
                  paddingTop: 10,
                }}
              >
                {chapters.map((c, i) => (
                  <li
                    key={`${c.start_seconds}-${i}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "3px 0",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStartAt(c.start_seconds)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--accent)",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 12,
                        minWidth: 60,
                        textAlign: "left",
                      }}
                    >
                      {formatChapterTime(c.start_seconds)}
                    </button>
                    <span style={{ color: "var(--ink-soft)" }}>
                      {c.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const VideoEmbedNode = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      // Back-compat: b108-2hx nodes have no provider attr — the
      // default makes them render as YouTube.
      provider: { default: "youtube" },
      video_id: { default: "" },
      // Legacy b108-2hx field — still written for YouTube nodes so
      // pre-v1-013 renderers keep working.
      youtube_id: { default: "" },
      title: { default: "" },
      caption: { default: "" },
      captions_url: { default: "" },
      chapters: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='video-embed']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block": "video-embed" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView);
  },
});
