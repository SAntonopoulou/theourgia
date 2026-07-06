/**
 * BibliomancyPanel — source + method picker · question + Open at random · passage figure.
 *
 * Verbatim from `Theourgia Divination Misc.dc.html` lines 150-178.
 * The passage is rendered as a `<figure>` with a `<blockquote>` and
 * a citation `<figcaption>` (semantic per H04 §S3.3).
 */

import { type CSSProperties, useState } from "react";

import {
  BIBLIO_DEFAULT_SOURCES,
  BIBLIO_LOG_LABEL,
  BIBLIO_METHOD_LABEL,
  BIBLIO_METHOD_NOTES,
  BIBLIO_OPEN_LABEL,
  BIBLIO_QUESTION_PLACEHOLDER,
  BIBLIO_SOURCE_LABEL,
} from "./copy.js";

type BibliomancyMethod = "page-finger" | "random-line" | "verse-number";

const METHOD_OPTIONS: ReadonlyArray<{
  key: BibliomancyMethod;
  label: string;
}> = [
  { key: "page-finger", label: "Page & finger" },
  { key: "random-line", label: "Random line" },
  { key: "verse-number", label: "By verse number" },
];

export interface BibliomancyPanelProps {
  sources?: readonly string[];
  /** Initial passage shown until the user clicks Open at random. */
  initialPassage?: string;
  initialReference?: string;
  onLog?: (entry: {
    question: string;
    passage: string;
    reference: string;
    method: BibliomancyMethod;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

const LABEL_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const METHOD_CHIP_BASE: CSSProperties = {
  padding: "7px 12px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const METHOD_CHIP_ON: CSSProperties = {
  ...METHOD_CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export function BibliomancyPanel({
  sources = BIBLIO_DEFAULT_SOURCES,
  initialPassage = "",
  initialReference = "",
  onLog,
  className,
  style,
}: BibliomancyPanelProps) {
  const [source, setSource] = useState(sources[0] ?? "");
  const [method, setMethod] = useState<BibliomancyMethod>("page-finger");
  const [question, setQuestion] = useState("");
  // Passage + reference will be replaced by the backend's response to
  // POST /api/v1/bibliomancy/open. Until that lands, "Open at random"
  // reshapes the reference line so the user sees their source pick
  // acknowledged.
  const [passage, setPassage] = useState(initialPassage);
  const [reference, setReference] = useState(initialReference);

  const openAtRandom = () => {
    setPassage((p) => p);
    setReference(`${source}, opened at random`);
  };

  return (
    <div
      data-component="bibliomancy-panel"
      className={className}
      style={{ maxWidth: 780, ...style }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label style={LABEL_STYLE} htmlFor="bib-source">
            {BIBLIO_SOURCE_LABEL}
          </label>
          <div style={{ position: "relative" }}>
            <select
              id="bib-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              data-source-select
              style={{
                width: "100%",
                padding: "11px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                appearance: "none",
              }}
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 13,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--ink-mute)",
              }}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <span style={LABEL_STYLE}>{BIBLIO_METHOD_LABEL}</span>
          <div
            role="group"
            aria-label={BIBLIO_METHOD_LABEL}
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {METHOD_OPTIONS.map((m) => {
              const on = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  data-method={m.key}
                  onClick={() => setMethod(m.key)}
                  style={on ? METHOD_CHIP_ON : METHOD_CHIP_BASE}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={BIBLIO_QUESTION_PLACEHOLDER}
          data-bibliomancy-question
          style={{
            flex: 1,
            padding: "12px 14px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-serif)",
            fontSize: 15,
          }}
        />
        <button
          type="button"
          onClick={openAtRandom}
          data-action="open-at-random"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 4h11l3 3v13H5z" />
            <path d="M9 4v16" />
          </svg>
          {BIBLIO_OPEN_LABEL}
        </button>
      </div>

      <figure
        data-passage-figure
        style={{
          margin: "0 0 22px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderLeftWidth: 3,
          borderLeftColor: "var(--accent)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          padding: "24px 28px",
        }}
      >
        <blockquote
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            lineHeight: 1.6,
            fontStyle: "italic",
            color: passage ? "var(--ink)" : "var(--ink-mute)",
            margin: 0,
          }}
        >
          {passage || "No passage opened yet — pick a source and press “Open at random”."}
        </blockquote>
        <figcaption
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 16,
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          {reference ? <span>{reference}</span> : <span>—</span>}
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{BIBLIO_METHOD_NOTES[method]}</span>
        </figcaption>
      </figure>

      <button
        type="button"
        data-action="log"
        onClick={() =>
          onLog?.({ question, passage, reference, method })
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
        </svg>
        {BIBLIO_LOG_LABEL}
      </button>
    </div>
  );
}
