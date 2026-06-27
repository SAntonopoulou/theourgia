/**
 * AgentTranscriptViewer — H10 Cluster C8 surface.
 *
 * Chronological transcript. Each row has a speaker label, a verbatim
 * body, and a collapsible per-row meta strip (tokens · model · ts ·
 * MCP-call count). Read-only — the transcript is immutable.
 */

import { useState, type CSSProperties } from "react";

import {
  IMMUTABLE_FOOTER,
  META_LABELS,
  type SpeakerKind,
  SPEAKER_LABEL,
} from "./copy.js";

export interface TranscriptRow {
  id: string;
  speaker: SpeakerKind;
  /** Override the default "Divination companion" / "You" label. */
  speakerLabel?: string;
  body: string;
  /** Per-row meta. Numbers are formatted by the parent for locale. */
  meta?: {
    tokens?: string;
    model?: string;
    timestamp?: string;
    mcpCalls?: string;
  };
}

export interface AgentTranscriptViewerSurfaceProps {
  rows: readonly TranscriptRow[];
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "26px 24px 40px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

function AgentIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function AgentTranscriptViewerSurface({
  rows,
  className,
  style,
}: AgentTranscriptViewerSurfaceProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {rows.map((r) => {
        const isAgent = r.speaker === "agent";
        const isOpen = !!openMap[r.id];
        const label =
          r.speakerLabel ?? SPEAKER_LABEL[r.speaker];
        return (
          <div
            key={r.id}
            data-row={r.id}
            data-speaker={r.speaker}
            style={{
              padding: "15px 17px",
              borderRadius: "var(--r-md)",
              background: isAgent ? "var(--bg-2)" : "transparent",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: isAgent ? "var(--line)" : "var(--line-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 7,
              }}
            >
              {isAgent ? (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "var(--r-sm)",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                  }}
                >
                  <AgentIcon />
                </span>
              ) : null}
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isAgent ? "var(--accent)" : "var(--ink-mute)",
                }}
              >
                {label}
              </span>
              {r.meta ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenMap((m) => ({ ...m, [r.id]: !m[r.id] }))
                  }
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {isOpen ? META_LABELS.hideDetail : META_LABELS.detail}
                </button>
              ) : null}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.65,
                color: isAgent ? "var(--ink)" : "var(--ink-soft)",
              }}
            >
              {r.body}
            </div>
            {isOpen && r.meta ? (
              <div
                data-meta
                style={{
                  marginTop: 9,
                  paddingTop: 9,
                  paddingBottom: 0,
                  borderTopWidth: 1,
                  borderTopStyle: "solid",
                  borderTopColor: "var(--line)",
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {r.meta.tokens ? <span>{r.meta.tokens} tokens</span> : null}
                {r.meta.model ? <span>{r.meta.model}</span> : null}
                {r.meta.timestamp ? <span>{r.meta.timestamp}</span> : null}
                {r.meta.mcpCalls ? <span>{r.meta.mcpCalls}</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          textAlign: "center",
          padding: 10,
        }}
      >
        {IMMUTABLE_FOOTER}
      </div>
    </div>
  );
}
