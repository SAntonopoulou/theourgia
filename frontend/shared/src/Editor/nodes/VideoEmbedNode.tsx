/**
 * Tiptap node — videoEmbed.
 *
 * b108-2hx · FEATURES §17 (video integration).
 *
 * Inline YouTube embed via the privacy-enhanced (youtube-nocookie.com)
 * host. Rendered inside a bordered card that reads like the other
 * custom blocks (calendar-stamp, correspondence, etc.). The iframe
 * is lazy-loaded so the embed only fires network requests when the
 * viewer actually scrolls it into view — matches the honesty rule:
 * no third-party requests until the user shows they want them.
 *
 * Persisted attrs:
 *   - youtube_id:  11-char ID, extracted from whatever URL the user pastes
 *   - title:       display title (shown above the iframe)
 *   - caption:     short editorial caption
 *   - captions_url: optional .vtt captions file for accessibility
 *   - chapters:    list of {title, start_seconds}
 *
 * The slash command inserts an empty node with all fields blank;
 * the user pastes a YouTube URL into the URL input and the node
 * extracts the ID.
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
  extractYoutubeId,
  parseChaptersInput,
  youtubeEmbedUrl,
  type VideoChapter,
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

function VideoEmbedView({ node, updateAttributes, editor }: NodeViewProps) {
  const youtubeId: string = node.attrs.youtube_id ?? "";
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

  const embedSrc = useMemo(() => {
    if (!youtubeId) return null;
    return youtubeEmbedUrl(youtubeId, { startSeconds: startAt });
  }, [youtubeId, startAt]);

  const commitUrlOrId = (raw: string): void => {
    const id = extractYoutubeId(raw);
    if (id) updateAttributes({ youtube_id: id });
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
        {captionsUrl ? (
          <span
            style={{
              marginLeft: "auto",
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
            type="text"
            defaultValue={youtubeId}
            onBlur={(e) => commitUrlOrId(e.target.value)}
            placeholder="Paste a YouTube URL or 11-char video ID"
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
            title={title || "YouTube video"}
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
            ? "Paste a YouTube URL above."
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
