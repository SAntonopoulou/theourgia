/**
 * Tiptap node — voiceRecording.
 *
 * Inline audio embed. v1: URL-based (points at a media asset in the R2
 * media library) plus an optional caption + optional transcript. The
 * upload flow lives on the Media Library surface; the slash command
 * inserts an empty node the user then populates by picking / uploading.
 *
 * Persisted attrs:
 *   - assetId:    optional server media asset id
 *   - url:        canonical audio URL (mp3, ogg, wav, m4a)
 *   - caption:    short label
 *   - transcript: optional transcript text
 *   - duration:   seconds (rendered as MM:SS)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

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

function fmtDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function VoiceRecordingView({ node, updateAttributes, editor }: NodeViewProps) {
  const url: string = node.attrs.url ?? "";
  const caption: string = node.attrs.caption ?? "";
  const transcript: string = node.attrs.transcript ?? "";
  const duration: number | null = typeof node.attrs.duration === "number"
    ? node.attrs.duration
    : null;
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      data-block="voice-recording"
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
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M6 10v2a6 6 0 0 0 12 0v-2M12 20v1" strokeLinecap="round" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Voice recording
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {fmtDuration(duration)}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        {editable && !url ? (
          <input
            type="url"
            value={url}
            onChange={(e) => updateAttributes({ url: e.target.value })}
            placeholder="Audio URL or /media/... path"
            aria-label="Voice recording URL"
            style={{
              ...inputBase,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 12,
              borderBottom: `1px solid ${LINE}`,
              paddingBottom: 6,
            }}
          />
        ) : url ? (
          <audio
            controls
            preload="metadata"
            src={url}
            style={{ width: "100%", marginBottom: 12 }}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (Number.isFinite(el.duration) && el.duration !== duration) {
                updateAttributes({ duration: el.duration });
              }
            }}
          >
            <track kind="captions" />
          </audio>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
              fontStyle: "italic",
              marginBottom: 12,
            }}
          >
            No recording yet — paste an audio URL or attach from the Media Library.
          </div>
        )}
        {editable ? (
          <input
            type="text"
            value={caption}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            placeholder="Caption"
            aria-label="Recording caption"
            style={{
              ...inputBase,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-soft)",
              marginBottom: transcript || editable ? 10 : 0,
            }}
          />
        ) : caption ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-soft)",
              margin: "0 0 10px",
            }}
          >
            {caption}
          </p>
        ) : null}
        {editable ? (
          <textarea
            value={transcript}
            onChange={(e) => updateAttributes({ transcript: e.target.value })}
            placeholder="Transcript (optional — Whisper-generated in Tier 2)"
            aria-label="Transcript"
            rows={3}
            style={{
              ...inputBase,
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink)",
              resize: "vertical",
              lineHeight: 1.55,
              minHeight: 60,
            }}
          />
        ) : transcript ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink)",
              lineHeight: 1.55,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {transcript}
          </p>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

export const VoiceRecordingNode = Node.create({
  name: "voiceRecording",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      assetId: { default: null },
      url: { default: "" },
      caption: { default: "" },
      transcript: { default: "" },
      duration: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='voice-recording']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block": "voice-recording" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoiceRecordingView);
  },
});
