/**
 * ExportPreview — parchment-framed preview for export operations.
 *
 * Per `Theourgia Export.dc.html`. Four render modes:
 *   - "entry-page"  : single-entry typeset page (PDF)
 *   - "bound-cover" : bound-volume title page (PDF)
 *   - "epub-cover"  : EPUB cover with spine sliver
 *   - "source"      : MD or HTML source text
 *
 * Uses the `--paper / --paper-2 / --paper-ink / --paper-ink-soft /
 * --paper-line` tokens; the parchment look is the showpiece figure of
 * this surface, so the values are lifted verbatim from the design.
 *
 * Sealed entries are NEVER exported — that policy is enforced at the
 * surface level. This component renders whatever it is given.
 */

import { type CSSProperties, type ReactNode } from "react";

export type ExportPreviewKind =
  | "entry-page"
  | "bound-cover"
  | "epub-cover"
  | "source";

export interface ExportEntryContent {
  title: string;
  kindLabel: string;
  /** Color token / hex for the kind-dot stripe. */
  kindColor: string;
  stamp: string;
  /** One paragraph per element. */
  paragraphs: string[];
  /** Optional citation strings (e.g. APA). */
  citations?: string[];
  pageLabel?: string;
}

export interface ExportBoundContent {
  title: string;
  subtitle: string;
  author: string;
}

export interface ExportEpubContent {
  title: string;
  author: string;
}

export interface ExportSourceContent {
  language: "markdown" | "html";
  text: string;
}

export type ExportPreviewRequest =
  | { kind: "entry-page"; entry: ExportEntryContent }
  | { kind: "bound-cover"; bound: ExportBoundContent }
  | { kind: "epub-cover"; epub: ExportEpubContent }
  | { kind: "source"; source: ExportSourceContent };

export interface ExportPreviewProps {
  request: ExportPreviewRequest;
  className?: string;
  style?: CSSProperties;
}

const paperBase: CSSProperties = {
  background: "linear-gradient(180deg, var(--paper), var(--paper-2))",
  color: "var(--paper-ink)",
  borderRadius: 3,
  boxShadow:
    "0 18px 50px rgba(0,0,0,.45), 0 2px 0 rgba(0,0,0,.2)",
  position: "relative",
  overflow: "hidden",
  fontFamily: "var(--font-serif)",
};

function Ornament() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--paper-line)",
      }}
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background: "currentColor",
          display: "block",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          color: "var(--paper-ink-soft)",
        }}
      >
        ❧
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "currentColor",
          display: "block",
        }}
      />
    </div>
  );
}

function EntryPage({ entry }: { entry: ExportEntryContent }) {
  return (
    <div
      data-export-mode="entry-page"
      style={{
        ...paperBase,
        width: 460,
        maxWidth: "100%",
        aspectRatio: "1 / 1.414",
        padding: "46px 44px",
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
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: entry.kindColor,
            display: "block",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--paper-ink-soft)",
          }}
        >
          {entry.kindLabel}
        </span>
      </div>
      <h1
        style={{
          margin: "0 0 10px",
          fontFamily: "var(--font-display)",
          fontSize: 25,
          lineHeight: 1.18,
          color: "var(--paper-ink)",
        }}
      >
        {entry.title}
      </h1>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--paper-ink-soft)",
          marginBottom: 18,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--paper-line)",
        }}
      >
        {entry.stamp}
      </div>
      {entry.paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            margin: "0 0 13px",
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            lineHeight: 1.66,
            color: "var(--paper-ink)",
            textAlign: "justify",
          }}
        >
          {p}
        </p>
      ))}
      {entry.citations && entry.citations.length > 0 ? (
        <div
          data-section="citations"
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--paper-line)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-ink-soft)",
              marginBottom: 6,
            }}
          >
            Citations
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--paper-ink-soft)",
            }}
          >
            {entry.citations.map((c, i) => (
              <div key={i}>
                {i + 1}. {c}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--paper-ink-soft)",
        }}
      >
        {entry.pageLabel ?? "— 1 —"}
      </div>
    </div>
  );
}

function BoundCover({ bound }: { bound: ExportBoundContent }) {
  return (
    <div
      data-export-mode="bound-cover"
      style={{
        ...paperBase,
        width: 460,
        maxWidth: "100%",
        aspectRatio: "1 / 1.414",
        padding: 34,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 18,
          borderWidth: 1.5,
          borderStyle: "solid",
          borderColor: "var(--paper-line)",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 23,
          borderWidth: 0.5,
          borderStyle: "solid",
          borderColor: "var(--paper-line)",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
          padding: "14px 10px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--paper-ink-soft)",
          }}
        >
          The Magical Record
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 66,
              height: 66,
              borderRadius: "50%",
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: "var(--paper-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: 32,
              color: "var(--paper-ink)",
            }}
          >
            Θ
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              lineHeight: 1.18,
              color: "var(--paper-ink)",
            }}
          >
            {bound.title}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--paper-ink-soft)",
            }}
          >
            {bound.subtitle}
          </div>
          <Ornament />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--paper-ink-soft)",
            }}
          >
            kept by
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 20,
              color: "var(--paper-ink)",
            }}
          >
            {bound.author}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--font-ui)",
              fontSize: 9.5,
              color: "var(--paper-ink-soft)",
            }}
          >
            Theourgia · sealed entries omitted
          </div>
        </div>
      </div>
    </div>
  );
}

function EpubCover({ epub }: { epub: ExportEpubContent }) {
  return (
    <div
      data-export-mode="epub-cover"
      style={{
        display: "flex",
        gap: 2,
        width: 330,
        maxWidth: "100%",
        aspectRatio: "1 / 1.5",
        boxShadow: "0 18px 50px rgba(0,0,0,.5)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {/* spine */}
      <div
        aria-hidden="true"
        style={{
          width: 16,
          flex: "none",
          background:
            "linear-gradient(90deg, rgba(0,0,0,.35), rgba(0,0,0,.05))",
          borderRightWidth: 1,
          borderRightStyle: "solid",
          borderRightColor: "rgba(0,0,0,.3)",
        }}
      />
      {/* cover face */}
      <div
        style={{
          flex: 1,
          background:
            "radial-gradient(120% 80% at 50% 16%, var(--bg-3), var(--bg-sunk))",
          color: "var(--ink)",
          padding: "40px 30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Theourgia
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: 28,
              color: "var(--accent)",
            }}
          >
            Θ
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              lineHeight: 1.2,
              color: "var(--ink)",
            }}
          >
            {epub.title}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 17,
            color: "var(--ink-soft)",
          }}
        >
          {epub.author}
        </div>
      </div>
    </div>
  );
}

function SourcePreview({ source }: { source: ExportSourceContent }) {
  return (
    <pre
      data-export-mode="source"
      data-language={source.language}
      style={{
        margin: 0,
        width: 460,
        maxWidth: "100%",
        maxHeight: 560,
        overflow: "auto",
        background: "var(--bg-sunk)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "20px 22px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--ink-soft)",
        whiteSpace: "pre-wrap",
      }}
    >
      {source.text}
    </pre>
  );
}

export function ExportPreview({
  request,
  className,
  style,
}: ExportPreviewProps): ReactNode {
  let body: ReactNode;
  if (request.kind === "entry-page") body = <EntryPage entry={request.entry} />;
  else if (request.kind === "bound-cover")
    body = <BoundCover bound={request.bound} />;
  else if (request.kind === "epub-cover")
    body = <EpubCover epub={request.epub} />;
  else body = <SourcePreview source={request.source} />;

  return (
    <div
      className={className}
      data-component="export-preview"
      data-kind={request.kind}
      style={{ display: "flex", justifyContent: "center", ...style }}
    >
      {body}
    </div>
  );
}
