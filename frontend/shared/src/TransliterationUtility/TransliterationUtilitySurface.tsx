/**
 * TransliterationUtilitySurface — H06 §S7.6.
 *
 * Three-column layout: source-script picker (left) · source text
 * input (centre) · scheme outputs (right).
 *
 * Honesty + H06 rules:
 *   • Every scheme card carries a `‡` chip citing its PD/standard
 *     source (B113 catalog provides the citation).
 *   • Round-trip status uses three symbols in distinct colours:
 *       ✓ lossless    var(--success)
 *       ◐ normalises  var(--accent)
 *       ✗ lossy       var(--ink-soft)
 *     Per the .dc.html copy verbatim: "Informational, not a quality
 *     judgement."
 *   • Lossy schemes that drop information surface a quiet `--warn`
 *     note explaining what's lost — never `--danger`.
 *   • Characters outside the source script are passed through
 *     unchanged. The footnote says so verbatim.
 *   • No --danger anywhere on the surface.
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SourceScript =
  | "greek"
  | "hebrew"
  | "sanskrit"
  | "arabic"
  | "coptic"
  | "latin";

export type RoundTripStatus = "lossless" | "normalises" | "lossy";

export interface SchemeOutput {
  slug: string;
  name: string;
  citation: string;
  output: string;
  round_trip_status: RoundTripStatus;
  /** Quiet --warn note for lossy schemes. */
  loss_note?: string | null;
}

export interface TransliterationUtilitySurfaceProps {
  /** Available source scripts, in display order. */
  scripts: readonly SourceScript[];
  active_script: SourceScript;
  input_text: string;
  /** Scheme outputs for the current input. The route owns
   *  transliteration (calls the B113 scheme tables or runs the
   *  client-side engine). */
  schemes: readonly SchemeOutput[];
  onScriptChange?: (next: SourceScript) => void;
  onInputChange?: (next: string) => void;
  onCopy?: (slug: string, output: string) => void;
  onRoundTripCheck?: () => void;
  onInsertIntoDraft?: () => void;
  onPasteSource?: () => void;
  /** Optional placeholder shown when input_text is empty. Used to
   *  hint at a sample without pre-filling the field as if it were the
   *  user's own text (b108-2fk). */
  input_placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

// ── Script defs ───────────────────────────────────────────────────

interface ScriptDef {
  id: SourceScript;
  label: string;
  sample: string;
  font: string;
  dir: "ltr" | "rtl";
}

const SCRIPT_DEFS: Record<SourceScript, ScriptDef> = {
  greek: {
    id: "greek",
    label: "Greek",
    sample: "Ἀ",
    font: "var(--font-serif)",
    dir: "ltr",
  },
  hebrew: {
    id: "hebrew",
    label: "Hebrew",
    sample: "א",
    font: "var(--font-hebrew, var(--font-serif))",
    dir: "rtl",
  },
  sanskrit: {
    id: "sanskrit",
    label: "Sanskrit",
    sample: "अ",
    font: "var(--font-deva, var(--font-serif))",
    dir: "ltr",
  },
  arabic: {
    id: "arabic",
    label: "Arabic",
    sample: "ا",
    font: "var(--font-arabic, var(--font-serif))",
    dir: "rtl",
  },
  coptic: {
    id: "coptic",
    label: "Coptic",
    sample: "Ⲁ",
    font: "var(--font-coptic, var(--font-serif))",
    dir: "ltr",
  },
  latin: {
    id: "latin",
    label: "Latin",
    sample: "A",
    font: "var(--font-serif)",
    dir: "ltr",
  },
};

// ── Round-trip glyphs ─────────────────────────────────────────────

function rtMarkFor(status: RoundTripStatus): {
  mark: string;
  color: string;
  title: string;
} {
  switch (status) {
    case "lossless":
      return {
        mark: "✓",
        color: "var(--success)",
        title: "lossless round-trip",
      };
    case "normalises":
      return {
        mark: "◐",
        color: "var(--accent)",
        title: "normalises some diacritics",
      };
    case "lossy":
      return {
        mark: "✗",
        color: "var(--ink-soft)",
        title: "diacritic loss possible",
      };
  }
}

// ── Icons ─────────────────────────────────────────────────────────

function CopyIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={9} y={9} width={11} height={11} rx={2} />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function RefreshIcon(): ReactElement {
  return (
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
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

function InsertIcon(): ReactElement {
  return (
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
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function TransliterationUtilitySurface({
  scripts,
  active_script,
  input_text,
  schemes,
  onScriptChange,
  onInputChange,
  onCopy,
  onRoundTripCheck,
  onInsertIntoDraft,
  onPasteSource,
  input_placeholder,
  className,
  style,
}: TransliterationUtilitySurfaceProps) {
  const srcMeta = SCRIPT_DEFS[active_script];
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopy = (slug: string, output: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(output).catch(() => {});
    }
    onCopy?.(slug, output);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  const sourceScripts = useMemo(
    () => scripts.filter((s) => s in SCRIPT_DEFS),
    [scripts],
  );

  return (
    <div
      data-component="transliteration-utility-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Transliteration
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            Render one script in another — every scheme cites its
            authority.
          </div>
        </div>
      </header>

      <div
        className="tr-cols"
        style={{
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* LEFT: source script picker */}
        <aside
          data-script-picker
          className="scroll tr-side"
          style={{
            flex: "0 0 240px",
            minWidth: 0,
            borderRight: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "18px 14px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              padding: "0 6px 10px",
            }}
          >
            Source script
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              marginBottom: 18,
            }}
          >
            {sourceScripts.map((s) => {
              const def = SCRIPT_DEFS[s];
              const on = s === active_script;
              return (
                <button
                  key={s}
                  type="button"
                  data-script={s}
                  aria-pressed={on}
                  onClick={() => onScriptChange?.(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 12px",
                    border: "1px solid transparent",
                    borderRadius: "var(--r-md)",
                    background: on ? "var(--accent-soft)" : "transparent",
                    borderColor: on ? "var(--accent)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: def.font,
                      fontSize: 18,
                      width: 24,
                      textAlign: "center",
                      flex: "none",
                      color: on ? "var(--ink)" : "var(--ink-mute)",
                    }}
                    aria-hidden="true"
                  >
                    {def.sample}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-ui)",
                      fontSize: 13.5,
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                    }}
                  >
                    {def.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.45,
              padding: "8px 6px 0",
            }}
          >
            Non-standard pairs (e.g. Aramaic → Latin) arrive with the
            community-contribution layer in Phase 14.
          </p>
        </aside>

        {/* CENTRE: source input */}
        <div
          className="scroll"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            padding: "22px 24px 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              data-paste-source
              onClick={onPasteSource}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 13px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <CopyIcon />
              Paste source
            </button>
          </div>
          <label
            htmlFor="tr-source-input"
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 8,
            }}
          >
            {srcMeta.label} source
          </label>
          <textarea
            id="tr-source-input"
            data-source-input
            rows={5}
            dir={srcMeta.dir}
            value={input_text}
            placeholder={input_placeholder}
            onChange={(e) => onInputChange?.(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 18px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: srcMeta.font,
              fontSize: 26,
              lineHeight: 1.5,
              resize: "vertical",
              marginBottom: 12,
            }}
          />
          <div
            data-passthrough-note
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            Characters outside the source script are passed through unchanged.
          </div>
        </div>

        {/* RIGHT: scheme results */}
        <aside
          className="scroll tr-side"
          data-schemes-rail
          style={{
            flex: "0 0 380px",
            minWidth: 0,
            borderLeft: "1px solid var(--line)",
            background: "var(--bg-2)",
            padding: "20px 18px 30px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 12,
            }}
          >
            {srcMeta.label} schemes
          </div>
          {schemes.length === 0 ? (
            <div
              data-schemes-empty
              style={{
                padding: "20px 4px",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
              }}
            >
              No schemes available for this script.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {schemes.map((s) => {
                const rt = rtMarkFor(s.round_trip_status);
                return (
                  <div
                    key={s.slug}
                    data-scheme-card={s.slug}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg)",
                      padding: "13px 15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 12,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {s.name}
                        </span>
                        <span
                          data-citation-chip
                          title={s.citation}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            fontFamily: "var(--font-glyph)",
                            fontSize: 10,
                          }}
                          aria-label={`Citation: ${s.citation}`}
                        >
                          ‡
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          data-rt-mark={s.round_trip_status}
                          title={rt.title}
                          style={{
                            color: rt.color,
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                          }}
                          aria-label={rt.title}
                        >
                          {rt.mark}
                        </span>
                        <button
                          type="button"
                          data-copy={s.slug}
                          aria-label={`Copy ${s.name} output`}
                          onClick={() => handleCopy(s.slug, s.output)}
                          style={{
                            color: "var(--ink-mute)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </div>
                    <div
                      data-scheme-output
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        color: "var(--ink)",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {s.output}
                    </div>
                    {s.loss_note ? (
                      <div
                        data-loss-note
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--warn)",
                          marginTop: 7,
                        }}
                      >
                        {s.loss_note}
                      </div>
                    ) : null}
                    {copiedSlug === s.slug ? (
                      <div
                        data-copied-flash
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                          marginTop: 4,
                        }}
                      >
                        Copied
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              data-round-trip
              onClick={onRoundTripCheck}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <RefreshIcon />
              Round-trip check
            </button>
            <p
              data-round-trip-legend
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
                margin: "9px 0 0",
              }}
            >
              Back-transliterates each scheme and compares against the
              original.{" "}
              <span style={{ color: "var(--success)" }}>✓</span> lossless ·{" "}
              <span style={{ color: "var(--accent)" }}>◐</span> normalises ·{" "}
              <span style={{ color: "var(--ink-soft)" }}>✗</span> diacritic
              loss. Informational, not a quality judgement.
            </p>
          </div>

          <div
            style={{
              marginTop: 18,
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              data-insert-paragraph
              onClick={onInsertIntoDraft}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: 11,
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
              <InsertIcon />
              Insert as lang-marked paragraph
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
