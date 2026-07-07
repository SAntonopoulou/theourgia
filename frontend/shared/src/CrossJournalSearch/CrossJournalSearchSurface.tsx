/**
 * CrossJournalSearchSurface — H06 §S7.2 (Cross-Journal Gematria
 * Search · worked example).
 *
 * The B111 search endpoint scans the practitioner's gematria_index
 * for every phrase that sums to a given value. This surface drives
 * that endpoint with three match modes (exact / near / reduced),
 * cipher filtering, and a cross-cipher resonance rail.
 *
 * Honesty + H06 rules (mirroring the B111 backend rules):
 *   • Sealed entries are NEVER indexed; the response carries a
 *     `sealed_match_count` ONLY (no phrase substrings). The surface
 *     renders this as a dashed `--seal-border` block: "N sealed
 *     entries match — the matched phrase isn't shown until you
 *     unlock."
 *   • Personal-cipher matches are flagged: results carry
 *     `cipher_personal=true|false` so the result card can surface
 *     "this match comes from your custom cipher only" when relevant.
 *   • No fabrication: the empty-query state, the no-match state,
 *     and the "Some recent entries may not yet be indexed" footnote
 *     are verbatim from the H06 .dc.html.
 *   • The Δ slider is only visible for "near" match mode; the
 *     reduced-mode hint is only visible for "reduced".
 *   • Save / CSV are the only two outputs — no leaderboards, no
 *     achievement chrome.
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type MatchMode = "exact" | "near" | "reduced";

export interface SearchCipher {
  id: string;
  name: string;
  language: string;
  personal: boolean;
}

export interface SearchResult {
  entry_id: string;
  entry_title: string | null;
  entry_date: string | null;
  phrase: string | null;
  cipher_id: string;
  cipher_name: string;
  cipher_personal: boolean;
  value: number;
  digit_sum: number;
  is_sealed: boolean;
}

export interface SearchResonance {
  phrase: string;
  value: number;
  ciphers: readonly string[];
}

export interface SearchResponse {
  total_matches: number;
  entries_with_matches: number;
  results: readonly SearchResult[];
  sealed_match_count: number;
  resonances: readonly SearchResonance[];
}

export interface CrossJournalSearchSurfaceProps {
  /** All ciphers visible to the caller (bundled + personal). */
  ciphers: readonly SearchCipher[];
  /** Live response from the latest `/gematria/search` call. */
  response: SearchResponse | null;
  /** True while a search is in flight. */
  loading?: boolean;
  /** Fires whenever the user changes inputs in a way that should
   *  re-run the query (or after the user submits). The route owns
   *  the debounce + the actual HTTP call. */
  onSearch: (payload: {
    value: number;
    cipher_ids: string[];
    match_mode: MatchMode;
    delta: number;
    include_personal_ciphers: boolean;
  }) => void;
  onSaveSearch?: (payload: {
    value: number;
    cipher_ids: string[];
    match_mode: MatchMode;
    delta: number;
    include_personal_ciphers: boolean;
  }) => void;
  onExportCsv?: (payload: {
    value: number;
    cipher_ids: string[];
    match_mode: MatchMode;
    delta: number;
    include_personal_ciphers: boolean;
  }) => void;
  onOpenEntry?: (entry_id: string) => void;
  onUnlockSealed?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Icons ─────────────────────────────────────────────────────────

function SaveIcon(): ReactElement {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h11l3 3v13H5z" />
    </svg>
  );
}

function SealIcon(): ReactElement {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function MarkIcon(): ReactElement {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

// ── Match modes ────────────────────────────────────────────────────

const MATCH_TABS: { id: MatchMode; label: string }[] = [
  { id: "exact", label: "Exact" },
  { id: "near", label: "Near" },
  { id: "reduced", label: "Reduced" },
];

// ── Surface ───────────────────────────────────────────────────────

export function CrossJournalSearchSurface({
  ciphers,
  response,
  loading = false,
  onSearch,
  onSaveSearch,
  onExportCsv,
  onOpenEntry,
  onUnlockSealed,
  className,
  style,
}: CrossJournalSearchSurfaceProps) {
  const [valueText, setValueText] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("exact");
  const [delta, setDelta] = useState(0);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [selectedCipherIds, setSelectedCipherIds] = useState<string[]>([]);
  const [cipherPickerOpen, setCipherPickerOpen] = useState(false);

  const parsedValue = useMemo(() => {
    const n = parseInt(valueText.replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }, [valueText]);

  const cipherButtonLabel = useMemo(() => {
    if (selectedCipherIds.length === 0) return "All ciphers";
    const names = selectedCipherIds
      .map((id) => ciphers.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return "All ciphers";
    if (names.length <= 3) return names.join(" · ");
    return `${names.slice(0, 3).join(" · ")} · +${names.length - 3}`;
  }, [selectedCipherIds, ciphers]);

  const buildPayload = () => ({
    value: parsedValue ?? 0,
    cipher_ids: selectedCipherIds,
    match_mode: matchMode,
    delta,
    include_personal_ciphers: includePersonal,
  });

  const submit = () => {
    if (parsedValue === null) return;
    onSearch(buildPayload());
  };

  const handleSave = () => {
    if (parsedValue === null) return;
    onSaveSearch?.(buildPayload());
  };

  const handleCsv = () => {
    if (parsedValue === null) return;
    onExportCsv?.(buildPayload());
  };

  const hasResults = response !== null && response.results.length > 0;
  const isEmptyQuery = parsedValue === null && response === null;
  const isNoMatch =
    parsedValue !== null &&
    response !== null &&
    response.total_matches === 0 &&
    response.sealed_match_count === 0;

  return (
    <div
      data-component="cross-journal-search-surface"
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
          gap: 16,
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
            Cross-Journal Gematria Search
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            Find every phrase in your journal that sums to a value.
          </div>
        </div>
      </header>

      <div
        className="scroll"
        style={{ overflowY: "auto", minHeight: 0, padding: 0 }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: "20px 26px 14px",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-end",
              flexWrap: "wrap",
              maxWidth: 1180,
            }}
          >
            <div style={{ flex: "0 0 200px" }}>
              <label
                htmlFor="cjs-value"
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 6,
                }}
              >
                Value
              </label>
              <input
                id="cjs-value"
                data-value-input
                type="text"
                inputMode="numeric"
                value={valueText}
                placeholder="0"
                onChange={(e) => setValueText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                onBlur={submit}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                }}
              />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 0, position: "relative" }}>
              <div
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 6,
                }}
              >
                Ciphers
              </div>
              <button
                type="button"
                data-cipher-picker
                aria-expanded={cipherPickerOpen}
                onClick={() => setCipherPickerOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "11px 13px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ flex: 1 }}>{cipherButtonLabel}</span>
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {cipherPickerOpen ? (
                <div
                  data-cipher-picker-panel
                  role="listbox"
                  aria-label="Choose ciphers"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg)",
                    boxShadow: "0 18px 60px rgba(0,0,0,.32)",
                    zIndex: 60,
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {ciphers.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                      }}
                    >
                      No ciphers available yet.
                    </div>
                  ) : (
                    ciphers.map((c) => {
                      const on = selectedCipherIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          data-cipher-option={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "9px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              setSelectedCipherIds((arr) =>
                                on
                                  ? arr.filter((x) => x !== c.id)
                                  : [...arr, c.id],
                              );
                            }}
                            style={{
                              position: "absolute",
                              opacity: 0,
                              pointerEvents: "none",
                            }}
                            aria-label={c.name}
                          />
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: `1px solid ${
                                on ? "var(--accent)" : "var(--line-2)"
                              }`,
                              background: on
                                ? "var(--accent)"
                                : "transparent",
                              flex: "none",
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontFamily: "var(--font-ui)",
                              fontSize: 13,
                              color: "var(--ink)",
                            }}
                          >
                            {c.name}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 11,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {c.language}
                            {c.personal ? " · personal" : ""}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
            <div>
              <div
                style={{
                  display: "block",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 6,
                }}
              >
                Match
              </div>
              <div
                role="group"
                aria-label="Match mode"
                style={{
                  display: "flex",
                  gap: 2,
                  padding: 3,
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--bg-2)",
                }}
              >
                {MATCH_TABS.map((m) => {
                  const on = m.id === matchMode;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-match-mode={m.id}
                      aria-pressed={on}
                      onClick={() => {
                        setMatchMode(m.id);
                        if (parsedValue !== null) {
                          onSearch({
                            value: parsedValue,
                            cipher_ids: selectedCipherIds,
                            match_mode: m.id,
                            delta,
                            include_personal_ciphers: includePersonal,
                          });
                        }
                      }}
                      style={{
                        padding: "6px 13px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: on ? "var(--ink)" : "var(--ink-mute)",
                        background: on ? "var(--accent-soft)" : "transparent",
                        border: `1px solid ${
                          on ? "var(--line-2)" : "transparent"
                        }`,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {matchMode === "near" ? (
            <div
              data-delta-row
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 12,
                maxWidth: 420,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  flex: "none",
                }}
              >
                Δ tolerance
              </span>
              <input
                type="range"
                min={0}
                max={10}
                value={delta}
                aria-label="Tolerance"
                data-delta-slider
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDelta(next);
                  if (parsedValue !== null) {
                    onSearch({
                      value: parsedValue,
                      cipher_ids: selectedCipherIds,
                      match_mode: "near",
                      delta: next,
                      include_personal_ciphers: includePersonal,
                    });
                  }
                }}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--accent)",
                  width: 24,
                }}
              >
                {delta}
              </span>
            </div>
          ) : null}

          {matchMode === "reduced" ? (
            <div
              data-reduced-hint
              style={{
                marginTop: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              Matches phrases whose digit-summed value equals your
              value's digit sum, regardless of cipher.
            </div>
          ) : null}

          {/* Filter row: include-personal toggle */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <label
              data-include-personal
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 11px",
                border: "1px solid var(--line)",
                borderRadius: 20,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={includePersonal}
                onChange={(e) => {
                  setIncludePersonal(e.target.checked);
                  if (parsedValue !== null) {
                    onSearch({
                      value: parsedValue,
                      cipher_ids: selectedCipherIds,
                      match_mode: matchMode,
                      delta,
                      include_personal_ciphers: e.target.checked,
                    });
                  }
                }}
                style={{
                  position: "absolute",
                  opacity: 0,
                  pointerEvents: "none",
                }}
                aria-label="Include personal ciphers"
              />
              <span
                style={{
                  width: 15,
                  height: 15,
                  border: `1px solid ${
                    includePersonal ? "var(--accent)" : "var(--line-2)"
                  }`,
                  background: includePersonal ? "var(--accent)" : "transparent",
                  borderRadius: 3,
                }}
              />
              Include personal ciphers
            </label>
          </div>
        </div>

        {/* Results + resonance rail */}
        <div
          style={{
            display: "flex",
            gap: 0,
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <div
            style={{ flex: "1 1 auto", minWidth: 0, padding: "18px 26px 50px" }}
          >
            {loading ? (
              <div
                data-cjs-loading
                style={{
                  textAlign: "center",
                  padding: "6vh 0",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                }}
              >
                Searching…
              </div>
            ) : null}

            {!loading && hasResults && response ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div
                    data-result-count-line
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {response.total_matches} phrases across{" "}
                    {response.entries_with_matches} entries sum to{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent)",
                      }}
                    >
                      {valueText}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      data-save-search
                      onClick={handleSave}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 13px",
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "transparent",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                      }}
                    >
                      <SaveIcon />
                      Save this search
                    </button>
                    <button
                      type="button"
                      data-export-csv
                      onClick={handleCsv}
                      style={{
                        padding: "7px 13px",
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "transparent",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                      }}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {response.results.map((r) => (
                    <button
                      key={`${r.entry_id}-${r.phrase}-${r.cipher_id}`}
                      type="button"
                      data-result-card
                      data-entry-id={r.entry_id}
                      data-cipher-personal={r.cipher_personal}
                      onClick={() => onOpenEntry?.(r.entry_id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        padding: "15px 18px",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          color: "var(--ink-mute)",
                          flex: "none",
                          marginTop: 2,
                        }}
                        aria-hidden="true"
                      >
                        <MarkIcon />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 10,
                            marginBottom: 5,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 17,
                              color: "var(--ink)",
                            }}
                          >
                            {r.entry_title ?? "Untitled entry"}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {r.entry_date ? r.entry_date.slice(0, 10) : ""}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 15,
                            color: "var(--ink-soft)",
                            lineHeight: 1.5,
                          }}
                        >
                          {r.phrase ?? ""}
                        </div>
                        {r.cipher_personal ? (
                          <div
                            data-personal-flag
                            style={{
                              marginTop: 4,
                              fontFamily: "var(--font-ui)",
                              fontSize: 10.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            via your personal cipher · not for shared studies
                          </div>
                        ) : null}
                      </div>
                      <div style={{ flex: "none", textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 18,
                            color: "var(--accent)",
                          }}
                        >
                          {r.value}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {r.cipher_name}
                        </div>
                      </div>
                    </button>
                  ))}

                  {response.sealed_match_count > 0 ? (
                    <div
                      data-sealed-block
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "15px 18px",
                        border: "1px dashed var(--seal-border)",
                        borderRadius: "var(--r-md)",
                        background: "var(--seal-soft)",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          color: "var(--seal)",
                          flex: "none",
                        }}
                        aria-hidden="true"
                      >
                        <SealIcon />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 13.5,
                            color: "var(--ink)",
                          }}
                        >
                          {response.sealed_match_count} sealed{" "}
                          {response.sealed_match_count === 1
                            ? "entry"
                            : "entries"}{" "}
                          match
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          The matched phrase isn't shown until you unlock.
                        </div>
                      </div>
                      <button
                        type="button"
                        data-unlock-sealed
                        onClick={onUnlockSealed}
                        style={{
                          padding: "8px 14px",
                          border: "1px solid var(--seal-border)",
                          borderRadius: "var(--r-md)",
                          background: "transparent",
                          fontFamily: "var(--font-ui)",
                          fontSize: 12.5,
                          color: "var(--seal)",
                          cursor: "pointer",
                        }}
                      >
                        Unlock to view
                      </button>
                    </div>
                  ) : null}
                </div>

                <p
                  data-indexing-footnote
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    textAlign: "center",
                    marginTop: 14,
                  }}
                >
                  Some recent entries may not yet be indexed.
                </p>
              </>
            ) : null}

            {!loading && isEmptyQuery ? (
              <div
                data-empty-query
                style={{
                  textAlign: "center",
                  padding: "9vh 0",
                  color: "var(--ink-mute)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 40,
                    color: "var(--line-2)",
                  }}
                  aria-hidden="true"
                >
                  ∑
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    margin: "14px auto 0",
                    maxWidth: 340,
                  }}
                >
                  Enter a value above. The search scans your journal's
                  gematria index for every phrase that sums to it.
                </p>
              </div>
            ) : null}

            {!loading && isNoMatch ? (
              <div
                data-no-match
                style={{
                  textAlign: "center",
                  padding: "9vh 0",
                  color: "var(--ink-mute)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 16,
                    lineHeight: 1.6,
                    margin: "0 auto",
                    maxWidth: 360,
                    color: "var(--ink-soft)",
                  }}
                >
                  No phrases in your journal sum to{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                    }}
                  >
                    {valueText}
                  </span>
                  . Try a wider Δ or a different cipher.
                </p>
                <p
                  data-indexing-footnote
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    marginTop: 10,
                  }}
                >
                  Some recent entries may not yet be indexed.
                </p>
              </div>
            ) : null}
          </div>

          {hasResults && response && response.resonances.length > 0 ? (
            <aside
              data-resonance-rail
              style={{
                flex: "0 0 300px",
                borderLeft: "1px solid var(--line)",
                background: "var(--bg-2)",
                padding: "18px 18px 30px",
              }}
            >
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
                    fontFamily: "var(--font-glyph)",
                    color: "var(--info)",
                  }}
                  aria-hidden="true"
                >
                  ❖
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                  }}
                >
                  Cross-cipher resonance
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                  margin: "0 0 16px",
                }}
              >
                Phrases that hit{" "}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent)",
                  }}
                >
                  {valueText}
                </span>{" "}
                across any cipher in your journal.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {response.resonances.map((x, i) => (
                  <div
                    key={`${x.phrase}-${x.value}-${i}`}
                    data-resonance-row
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-sm)",
                      background: "var(--bg)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        color: "var(--ink)",
                        marginBottom: 3,
                      }}
                    >
                      {x.phrase}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--accent)",
                        }}
                      >
                        {x.value}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {x.ciphers.join(" · ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
