/**
 * GematriaCalculatorSurface — H06 §S6.1.
 *
 * Two-pane surface: left cipher picker rail · centre input + results.
 * Composes the gematria cipher catalog from `../gematria/`.
 *
 * Honesty rules (H06):
 *   • Every bundled cipher cites a PD source — surfaced via `‡`.
 *   • Cross-cipher resonance ≥ 2 ciphers · top 5 shown.
 *   • "Save as study" is a committed-make moment; the consumer
 *     handles persistence. The "Computations aren't saved as their
 *     own rows" microcopy stays verbatim from the .dc.html.
 *   • Custom-cipher modal: every letter must have a value; the
 *     "X letters still hold zero" notice is `--warn`, NEVER
 *     `--danger`.
 *   • Insert-into-draft renders the same `gematria` Tiptap block
 *     the editor's /gematria command produces (editor block embed
 *     parity, rule #13).
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

import {
  BUNDLED_CIPHERS,
  type Cipher,
  type CipherResonance,
  computeGematria,
  findResonances,
  groupCiphersByLanguage,
} from "../gematria/index.js";

import {
  GC_COPY_TABLE_LABEL,
  GC_CUSTOM_CANCEL,
  GC_CUSTOM_CITATION_LABEL_PREFIX,
  GC_CUSTOM_CITATION_LABEL_TAIL,
  GC_CUSTOM_CITATION_PLACEHOLDER,
  GC_CUSTOM_CTA,
  GC_CUSTOM_INCOMPLETE_NOTICE_PREFIX,
  GC_CUSTOM_INCOMPLETE_NOTICE_TAIL,
  GC_CUSTOM_LANGUAGE_LABEL,
  GC_CUSTOM_MAPPING_LABEL_PREFIX,
  GC_CUSTOM_MAPPING_LABEL_TAIL,
  GC_CUSTOM_NAME_DEFAULT,
  GC_CUSTOM_NAME_LABEL,
  GC_CUSTOM_SAVE,
  GC_CUSTOM_TITLE,
  GC_DEFAULT_INPUT,
  GC_EMPTY_BODY,
  GC_EMPTY_HEADING_GLYPHS,
  GC_FILTER_PLACEHOLDER,
  GC_INPUT_HELP_TAIL,
  GC_INSERT_BODY,
  GC_INSERT_CANCEL,
  GC_INSERT_COMMIT,
  GC_INSERT_PRIMARY_TAIL_PREFIX,
  GC_INSERT_TITLE,
  GC_LANG_LABELS,
  GC_PERSONAL_BADGE,
  GC_PERSONAL_BADGE_TITLE,
  GC_QUIET_NOTE,
  GC_RESONANCE_DETAIL_END,
  GC_RESONANCE_DETAIL_PREFIX,
  GC_RESONANCE_DETAIL_TAIL,
  GC_RESONANCE_HEADING,
  GC_SAVE_STUDY_LABEL,
  GC_TEXT_INPUT_LABEL,
  GC_TEXT_INPUT_PLACEHOLDER,
  GC_TOPBAR_SUBTITLE,
  GC_TOPBAR_TITLE,
} from "./copy.js";

// ── Styles (token-only · literal from the .dc.html) ────────────────

const PANES_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
  flex: 1,
};

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 300px",
  minWidth: 0,
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "16px 14px",
  overflowY: "auto",
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "22px 26px 50px",
};

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "13px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const FILTER_WRAP: CSSProperties = {
  position: "relative",
  marginBottom: 14,
};

const FILTER_ICON_WRAP: CSSProperties = {
  position: "absolute",
  left: 11,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--ink-mute)",
};

const FILTER_INPUT: CSSProperties = {
  width: "100%",
  padding: "9px 11px 9px 32px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
};

const LANG_EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  padding: "0 6px 6px",
};

const CUSTOM_CTA_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const INPUT_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const INPUT_BOX: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 22,
  lineHeight: 1.4,
  resize: "vertical",
  marginBottom: 8,
};

const INPUT_HELP: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
  marginBottom: 22,
};

const RESULTS_GROUP: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
  marginBottom: 24,
};

const RESULT_ROW: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: "16px 18px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg-2)",
};

const RESONANCE_CARD: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background:
    "linear-gradient(180deg,var(--info-soft),transparent)",
  padding: "18px 20px",
  marginBottom: 24,
};

const FOOTER_BAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  paddingTop: 18,
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
};

const PRIMARY_CTA: CSSProperties = {
  display: "flex",
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
};

const SECONDARY_CTA: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 15px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const MODAL_PANEL: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px",
};

const INSERT_MODAL_PANEL: CSSProperties = {
  ...MODAL_PANEL,
  width: "min(440px, 100%)",
};

// ── Icons ──────────────────────────────────────────────────────────

function SearchIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PlusIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

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

function WarnIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

// ── Props + types ──────────────────────────────────────────────────

export interface GematriaCalculatorSurfaceProps {
  /** Initial input text. Defaults to "ἀγαθοδαίμων" (the .dc.html
   *  example). */
  initialInput?: string;
  /** Initially-selected cipher ids. Defaults to Greek Isopsephy +
   *  Hebrew Mispar Hechrachi (matches the .dc.html). */
  initialSelectedCipherIds?: readonly string[];
  /** Custom + bundled ciphers to show. Defaults to BUNDLED_CIPHERS. */
  ciphers?: readonly Cipher[];
  /** Fired when the "Save as study" CTA is clicked. The consumer
   *  decides whether to POST a study row, open a save dialog, or
   *  Toast — the surface is agnostic. */
  onSaveStudy?: (payload: {
    input: string;
    cipherIds: readonly string[];
    results: GematriaResult[];
  }) => void;
  /** Fired when the practitioner confirms inserting the result into
   *  a working entry. The consumer wires this to the Editor's
   *  gematria block (the same shape /gematria produces). */
  onInsertIntoEntry?: (payload: {
    word: string;
    cipherId: string;
    value: number;
  }) => void;
  /** Fired when the practitioner saves a new custom cipher. The
   *  consumer persists it to the vault. */
  onSaveCustomCipher?: (cipher: Cipher) => void;
  className?: string;
  style?: CSSProperties;
}

interface GematriaResult {
  cipherId: string;
  cipherName: string;
  citation: string;
  hasCite: boolean;
  value: number;
  breakdown: string;
  digitSum: number;
  mod9: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function buildBreakdown(parts: { letter: string; value: number }[], skipped: string[]): string {
  const partsStr = parts.map((p) => `${p.letter}·${p.value}`).join("   ");
  const skipStr =
    skipped.length > 0
      ? "   " + skipped.map((s) => `${s} (skipped)`).join(" ")
      : "";
  return partsStr + skipStr || "—";
}

function langLabel(language: string): string {
  return GC_LANG_LABELS[language] ?? language;
}

// ── Surface ───────────────────────────────────────────────────────

export function GematriaCalculatorSurface({
  initialInput = GC_DEFAULT_INPUT,
  initialSelectedCipherIds = ["greek-iso", "heb-hechrachi"],
  ciphers = BUNDLED_CIPHERS,
  onSaveStudy,
  onInsertIntoEntry,
  onSaveCustomCipher,
  className,
  style,
}: GematriaCalculatorSurfaceProps) {
  const [input, setInput] = useState(initialInput);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedCipherIds),
  );
  const [filter, setFilter] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q === "") return ciphers;
    return ciphers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.language.toLowerCase().includes(q),
    );
  }, [filter, ciphers]);

  const groups = useMemo(
    () => groupCiphersByLanguage(filtered),
    [filtered],
  );

  const selectedCiphers = useMemo(
    () => ciphers.filter((c) => selectedIds.has(c.id)),
    [ciphers, selectedIds],
  );

  const results = useMemo<GematriaResult[]>(() => {
    if (input.trim() === "") return [];
    return selectedCiphers.map((c) => {
      const r = computeGematria(input, c);
      return {
        cipherId: c.id,
        cipherName: c.name,
        citation: c.citation,
        hasCite: !c.personal && c.citation.length > 0,
        value: r.total,
        breakdown: buildBreakdown(r.parts, r.skipped),
        digitSum: r.digit_sum,
        mod9: r.total % 9,
      };
    });
  }, [input, selectedCiphers]);

  const hasResults = results.length > 0;

  const resonances = useMemo<CipherResonance[]>(
    () =>
      findResonances(
        results.map((r) => ({ cipher_name: r.cipherName, value: r.value })),
      ).slice(0, 5),
    [results],
  );

  const toggleCipher = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveStudy = () => {
    onSaveStudy?.({
      input,
      cipherIds: results.map((r) => r.cipherId),
      results,
    });
  };

  const handleInsert = () => {
    if (!results[0]) return;
    onInsertIntoEntry?.({
      word: input,
      cipherId: results[0].cipherId,
      value: results[0].value,
    });
    setInsertOpen(false);
  };

  return (
    <div
      data-component="gematria-calculator-surface"
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
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {GC_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {GC_TOPBAR_SUBTITLE}
          </div>
        </div>
      </header>

      <div className="gc-panes" style={PANES_STYLE}>
        {/* LEFT: cipher picker */}
        <aside
          className="scroll gc-rail"
          aria-label="Cipher picker"
          style={RAIL_STYLE}
        >
          <div style={FILTER_WRAP}>
            <span style={FILTER_ICON_WRAP}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={GC_FILTER_PLACEHOLDER}
              aria-label={GC_FILTER_PLACEHOLDER}
              style={FILTER_INPUT}
              data-cipher-filter
            />
          </div>

          {groups.map((g) => (
            <div key={g.language} style={{ marginBottom: 14 }}>
              <div style={LANG_EYEBROW}>{langLabel(g.language)}</div>
              {g.ciphers.map((c) => {
                const on = selectedIds.has(c.id);
                const rowStyle: CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "8px 8px",
                  borderRadius: "var(--r-sm)",
                  marginBottom: 1,
                  background: on ? "var(--accent-soft)" : "transparent",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--line-2)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                };
                const boxStyle: CSSProperties = {
                  width: 17,
                  height: 17,
                  flex: "none",
                  borderRadius: 4,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--accent)" : "var(--line-2)",
                  background: on ? "var(--accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-ink)",
                };
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    data-cipher-id={c.id}
                    onClick={() => toggleCipher(c.id)}
                    style={rowStyle}
                  >
                    <span style={boxStyle} aria-hidden="true">
                      {on ? (
                        <svg
                          width={11}
                          height={11}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 6.5" />
                        </svg>
                      ) : null}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        textAlign: "left",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                      }}
                    >
                      {c.name}
                    </span>
                    {c.personal ? (
                      <span
                        title={GC_PERSONAL_BADGE_TITLE}
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-mute)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line-2)",
                          borderRadius: 20,
                          padding: "1px 6px",
                        }}
                      >
                        {GC_PERSONAL_BADGE}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            style={CUSTOM_CTA_STYLE}
            data-action="open-custom-cipher"
          >
            <PlusIcon />
            {GC_CUSTOM_CTA}
          </button>
        </aside>

        {/* CENTRE: input + results */}
        <main className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <label htmlFor="gc-text-input" style={INPUT_LABEL}>
              {GC_TEXT_INPUT_LABEL}
            </label>
            <textarea
              id="gc-text-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={GC_TEXT_INPUT_PLACEHOLDER}
              aria-label={GC_TEXT_INPUT_LABEL}
              style={INPUT_BOX}
              data-gc-input
            />
            <div style={INPUT_HELP}>
              {selectedCiphers.length} ciphers selected · {GC_INPUT_HELP_TAIL}
            </div>

            {hasResults ? (
              <>
                <div data-gc-results style={RESULTS_GROUP}>
                  {results.map((r) => (
                    <div key={r.cipherId} style={RESULT_ROW}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 13.5,
                              color: "var(--ink)",
                            }}
                          >
                            {r.cipherName}
                          </span>
                          {r.hasCite ? (
                            <span
                              title={r.citation}
                              aria-label={`Citation: ${r.citation}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 17,
                                height: 17,
                                borderRadius: 4,
                                background: "var(--accent-soft)",
                                color: "var(--accent)",
                                fontFamily: "var(--font-glyph)",
                                fontSize: 11,
                              }}
                            >
                              ‡
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                            lineHeight: 1.7,
                          }}
                        >
                          {r.breakdown}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            color: "var(--ink-mute)",
                            marginTop: 5,
                          }}
                        >
                          digit sum {r.digitSum} · mod 9 = {r.mod9}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: "none",
                          fontFamily: "var(--font-mono)",
                          fontSize: 30,
                          color: "var(--accent)",
                          lineHeight: 1,
                        }}
                      >
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>

                {resonances.length > 0 ? (
                  <div data-gc-resonance style={RESONANCE_CARD}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontFamily: "var(--font-glyph)",
                          color: "var(--info)",
                        }}
                      >
                        ❖
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 17,
                        }}
                      >
                        {GC_RESONANCE_HEADING}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {resonances.map((x) => (
                        <div
                          key={x.value}
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 20,
                              color: "var(--info)",
                              flex: "none",
                              width: 54,
                            }}
                          >
                            {x.value}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontSize: 14.5,
                              color: "var(--ink-soft)",
                              lineHeight: 1.5,
                            }}
                          >
                            {GC_RESONANCE_DETAIL_PREFIX}
                            {x.cipher_names.join(" and ")}
                            {GC_RESONANCE_DETAIL_TAIL}
                            {x.cipher_names.length}
                            {GC_RESONANCE_DETAIL_END}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={FOOTER_BAR}>
                  <button
                    type="button"
                    data-action="save-as-study"
                    onClick={handleSaveStudy}
                    style={PRIMARY_CTA}
                  >
                    <InsertIcon />
                    {GC_SAVE_STUDY_LABEL}
                  </button>
                  <button
                    type="button"
                    data-action="copy-table"
                    onClick={() => setInsertOpen(true)}
                    style={SECONDARY_CTA}
                  >
                    <CopyIcon />
                    {GC_COPY_TABLE_LABEL}
                  </button>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {GC_QUIET_NOTE}
                  </span>
                </div>
              </>
            ) : (
              <div
                data-gc-empty
                style={{
                  textAlign: "center",
                  padding: "8vh 0",
                  color: "var(--ink-mute)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 38,
                    color: "var(--line-2)",
                  }}
                  aria-hidden="true"
                >
                  {GC_EMPTY_HEADING_GLYPHS}
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    margin: "14px auto 0",
                    maxWidth: 320,
                  }}
                >
                  {GC_EMPTY_BODY}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {customOpen ? (
        <CustomCipherModal
          onClose={() => setCustomOpen(false)}
          onSave={(c) => {
            onSaveCustomCipher?.(c);
            setCustomOpen(false);
          }}
        />
      ) : null}

      {insertOpen && results[0] ? (
        <InsertIntoDraftModal
          word={input}
          primary={results[0]}
          alsoNames={results.slice(1).map((r) => r.cipherName).join(", ")}
          onClose={() => setInsertOpen(false)}
          onConfirm={handleInsert}
        />
      ) : null}
    </div>
  );
}

// ── Custom cipher modal ───────────────────────────────────────────

interface CustomCipherModalProps {
  onClose: () => void;
  onSave: (cipher: Cipher) => void;
}

function CustomCipherModal({ onClose, onSave }: CustomCipherModalProps) {
  const [name, setName] = useState(GC_CUSTOM_NAME_DEFAULT);
  const [language, setLanguage] = useState<string>("english");
  const [citation, setCitation] = useState("");
  // 26 English letters with default value 0; the practitioner fills them in.
  const [mapping, setMapping] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (let i = 0; i < 26; i++) {
      m[String.fromCharCode(97 + i)] = 0;
    }
    return m;
  });

  const zeroCount = Object.values(mapping).filter((v) => v === 0).length;
  const incomplete = zeroCount > 0;

  const handleSave = () => {
    onSave({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim() || GC_CUSTOM_NAME_DEFAULT,
      language: language as Cipher["language"],
      citation: citation.trim(),
      personal: citation.trim().length === 0,
      values: { ...mapping },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={GC_CUSTOM_TITLE}
      style={SCRIM}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div className="scroll" style={{ ...MODAL_PANEL, maxHeight: "88vh", overflowY: "auto" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: "0 0 18px",
          }}
        >
          {GC_CUSTOM_TITLE}
        </h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1.4 }}>
            <label
              htmlFor="gc-custom-name"
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              {GC_CUSTOM_NAME_LABEL}
            </label>
            <input
              id="gc-custom-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
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
          </div>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="gc-custom-language"
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 6,
              }}
            >
              {GC_CUSTOM_LANGUAGE_LABEL}
            </label>
            <select
              id="gc-custom-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
              }}
            >
              <option value="english">English</option>
              <option value="greek">Greek</option>
              <option value="hebrew">Hebrew</option>
              <option value="coptic">Coptic</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <label
          htmlFor="gc-custom-citation"
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 6,
          }}
        >
          {GC_CUSTOM_CITATION_LABEL_PREFIX}{" "}
          <span style={{ color: "var(--ink-mute)" }}>
            {GC_CUSTOM_CITATION_LABEL_TAIL}
          </span>
        </label>
        <input
          id="gc-custom-citation"
          type="text"
          value={citation}
          onChange={(e) => setCitation(e.target.value)}
          placeholder={GC_CUSTOM_CITATION_PLACEHOLDER}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            marginBottom: 16,
          }}
        />
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 8,
          }}
        >
          {GC_CUSTOM_MAPPING_LABEL_PREFIX}{" "}
          <span style={{ color: "var(--ink-mute)" }}>
            {GC_CUSTOM_MAPPING_LABEL_TAIL}
          </span>
        </label>
        <div
          className="scroll"
          style={{
            maxHeight: 200,
            overflowY: "auto",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(78px,1fr))",
              gap: 6,
            }}
          >
            {Object.entries(mapping).map(([letter, value]) => (
              <div
                key={letter}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg)",
                  padding: "4px 6px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    width: 18,
                    textAlign: "center",
                    color: "var(--ink)",
                  }}
                >
                  {letter.toUpperCase()}
                </span>
                <input
                  type="number"
                  min={0}
                  value={value === 0 ? "" : value}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [letter]: Number(e.target.value) || 0,
                    }))
                  }
                  aria-label={`Value for letter ${letter.toUpperCase()}`}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    textAlign: "right",
                    minWidth: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {incomplete ? (
          <div
            data-warn-incomplete
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "12px 0 18px",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--warn)",
            }}
          >
            <WarnIcon />
            {zeroCount}
            {GC_CUSTOM_INCOMPLETE_NOTICE_PREFIX}
            {GC_CUSTOM_INCOMPLETE_NOTICE_TAIL}
          </div>
        ) : (
          <div style={{ height: 18 }} />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {GC_CUSTOM_CANCEL}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={incomplete}
            aria-disabled={incomplete}
            data-action="save-custom-cipher"
            style={{
              flex: 1.4,
              padding: 12,
              borderRadius: "var(--r-md)",
              background: incomplete ? "var(--bg-3)" : "var(--accent)",
              color: incomplete ? "var(--ink-mute)" : "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: incomplete ? "not-allowed" : "pointer",
            }}
          >
            {GC_CUSTOM_SAVE}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Insert into draft modal ───────────────────────────────────────

interface InsertIntoDraftModalProps {
  word: string;
  primary: GematriaResult;
  alsoNames: string;
  onClose: () => void;
  onConfirm: () => void;
}

function InsertIntoDraftModal({
  word,
  primary,
  alsoNames,
  onClose,
  onConfirm,
}: InsertIntoDraftModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={GC_INSERT_TITLE}
      style={SCRIM}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={INSERT_MODAL_PANEL}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            margin: "0 0 4px",
          }}
        >
          {GC_INSERT_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 18px",
          }}
        >
          {GC_INSERT_BODY}
        </p>
        <div
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            padding: "16px 18px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
              }}
            >
              {word}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                color: "var(--accent)",
              }}
            >
              {primary.value}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 6,
            }}
          >
            {primary.cipherName}
            {GC_INSERT_PRIMARY_TAIL_PREFIX}
            {alsoNames || "none"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {GC_INSERT_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-action="insert-into-draft"
            style={{
              flex: 1.6,
              padding: 12,
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
            {GC_INSERT_COMMIT}
          </button>
        </div>
      </div>
    </div>
  );
}
