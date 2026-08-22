/**
 * AdoptLibrary — the library of what installed packs offer a practice, as a
 * proper dialog: browse cards, open one to read it whole, adopt from there.
 *
 * This replaces the flat "index of everything" the practice pages briefly
 * wore (Sophia, 22 Aug: unusable as a collection grows, and nothing like the
 * phone). The shape it takes instead:
 *
 *   - The page leads with YOUR practice; one button opens this library.
 *   - Inside: search, a filter per source pack, and the offerings as cards —
 *     name in the display face, its pack, its measures, three lines of what
 *     it is. What you already hold is marked, not hidden.
 *   - A card opens to the detail: the full description, the script or the
 *     phases, any caution — and Adopt, which copies it into your own.
 *   - Packs relevant to the practice that are not yet installed are
 *     installable at the top, so install → adopt is one motion.
 *
 * Presentation only: parsing and writing stay in the per-practice data
 * modules; this renders what it is handed and calls back.
 */

import { Toast } from "@theourgia/shared";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import { PracticePacks } from "./PracticePacks.js";

export interface AdoptOfferingSection {
  title: string;
  /** Pre-line text — scripts keep their line breaks byte-exact. */
  body: string;
}

export interface AdoptOffering {
  /** Stable within the open dialog. */
  key: string;
  name: string;
  summary: string;
  /** Small measures — "7 phases", "10 min", "4 stations". */
  badges?: string[];
  /** A warning that travels with it; shown before the adopt, never dropped. */
  caution?: string;
  /** The pack it came from — the filter chips and the card's source line. */
  packTitle?: string;
  /** Already in the practitioner's own practice (matched by name). */
  held?: boolean;
  /** The detail pane's sections — script, phases, the words at each station. */
  sections?: AdoptOfferingSection[];
}

export interface AdoptLibraryProps {
  open: boolean;
  onClose: () => void;
  /** "The library — rites" */
  title: string;
  /** What adopting means here, said once under the title. */
  intro: string;
  /** The phone's ModuleKind keys, for the install strip. */
  kinds: readonly string[];
  offerings: readonly AdoptOffering[];
  /** Shown when no installed pack offers anything (install strip still shows). */
  emptyText: string;
  adoptLabel?: string;
  onAdopt: (offering: AdoptOffering) => Promise<void>;
  /** After an in-dialog pack install — refetch the offerings. */
  onInstalled?: () => void;
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const chipBase: CSSProperties = {
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const badgePill: CSSProperties = {
  padding: "2px 9px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  color: "var(--ink-mute)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  whiteSpace: "nowrap",
};

export function AdoptLibrary({
  open,
  onClose,
  title,
  intro,
  kinds,
  offerings,
  emptyText,
  adoptLabel = "Adopt",
  onAdopt,
  onInstalled,
}: AdoptLibraryProps) {
  const [query, setQuery] = useState("");
  const [packFilter, setPackFilter] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justAdopted, setJustAdopted] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes; the page behind holds still while the library is open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // A closed dialog forgets its browsing state; reopening starts at the shelf.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setPackFilter(null);
      setOpenKey(null);
    }
  }, [open]);

  const packs = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const o of offerings) {
      if (o.packTitle && !seen.has(o.packTitle)) {
        seen.add(o.packTitle);
        out.push(o.packTitle);
      }
    }
    return out;
  }, [offerings]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offerings.filter((o) => {
      if (packFilter !== null && o.packTitle !== packFilter) return false;
      if (q.length === 0) return true;
      return o.name.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q);
    });
  }, [offerings, query, packFilter]);

  const opened = openKey === null ? null : (offerings.find((o) => o.key === openKey) ?? null);

  async function adopt(offering: AdoptOffering): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await onAdopt(offering);
      setJustAdopted((s) => new Set(s).add(offering.key));
      Toast.push({ tone: "success", title: `Adopted "${offering.name}"` });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't adopt",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--ink) 45%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop stop-propagation; Escape closes the dialog. */}
      <div
        ref={panelRef}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: dialog receives focus on open.
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          boxShadow: "0 18px 60px color-mix(in srgb, var(--ink) 30%, transparent)",
          overflow: "hidden",
        }}
      >
        {/* ── Head ─────────────────────────────────────────────── */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eyebrow}>The library</div>
              <h2
                style={{
                  margin: "4px 0 4px",
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 24,
                  fontWeight: 400,
                  color: "var(--ink)",
                }}
              >
                {title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                  maxWidth: 560,
                }}
              >
                {intro}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close the library"
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--ink-mute)",
                fontSize: 18,
                cursor: "pointer",
                padding: "2px 6px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {opened === null ? (
            <>
              {/* ── Search + source filters ─────────────────────── */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  margin: "16px 0 0",
                }}
              >
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the offerings…"
                  aria-label="Search the offerings"
                  style={{
                    flex: "1 1 220px",
                    minWidth: 0,
                    padding: "8px 12px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 10px)",
                    background: "var(--bg-2)",
                    color: "var(--ink)",
                  }}
                />
                {packs.length > 1 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setPackFilter(null)}
                      aria-pressed={packFilter === null}
                      style={
                        packFilter === null
                          ? { ...chipBase, borderColor: "var(--accent)", color: "var(--ink)" }
                          : chipBase
                      }
                    >
                      All packs
                    </button>
                    {packs.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPackFilter(packFilter === p ? null : p)}
                        aria-pressed={packFilter === p}
                        style={
                          packFilter === p
                            ? { ...chipBase, borderColor: "var(--accent)", color: "var(--ink)" }
                            : chipBase
                        }
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Packs for this practice not yet installed. */}
              <PracticePacks kinds={kinds} onInstalled={onInstalled} installedCollapsed />
            </>
          ) : null}
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", padding: "16px 24px 24px", minHeight: 120 }}>
          {opened === null ? (
            shown.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.6,
                  maxWidth: 460,
                }}
              >
                {offerings.length === 0 ? emptyText : "Nothing answers that search."}
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: 12,
                }}
              >
                {shown.map((o) => {
                  const held = o.held || justAdopted.has(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setOpenKey(o.key)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 8,
                        textAlign: "left",
                        padding: "14px 16px",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-lg, 14px)",
                        background: "var(--bg-2)",
                        color: "var(--ink)",
                        cursor: "pointer",
                        minWidth: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--line)";
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display, var(--font-serif))",
                          fontSize: 16.5,
                          lineHeight: 1.3,
                        }}
                      >
                        {o.name}
                      </span>
                      {o.badges?.length || held || o.caution ? (
                        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {held ? (
                            <span
                              style={{
                                ...badgePill,
                                borderColor: "var(--accent)",
                                color: "var(--accent)",
                              }}
                            >
                              ✓ In your practice
                            </span>
                          ) : null}
                          {(o.badges ?? []).map((b) => (
                            <span key={b} style={badgePill}>
                              {b}
                            </span>
                          ))}
                          {o.caution ? (
                            <span
                              style={{
                                ...badgePill,
                                borderColor: "var(--warning, var(--accent))",
                                color: "var(--warning, var(--accent))",
                              }}
                            >
                              take care
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 13.5,
                          color: "var(--ink-soft)",
                          lineHeight: 1.55,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 0,
                        }}
                      >
                        {o.summary}
                      </span>
                      {o.packTitle ? (
                        <span
                          style={{
                            marginTop: "auto",
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--ink-mute)",
                          }}
                        >
                          {o.packTitle}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div>
              {/* ── One offering, whole ─────────────────────────── */}
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 14,
                }}
              >
                ‹ All offerings
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display, var(--font-serif))",
                      fontSize: 21,
                      fontWeight: 400,
                      color: "var(--ink)",
                    }}
                  >
                    {opened.name}
                  </h3>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {opened.held || justAdopted.has(opened.key) ? (
                      <span
                        style={{
                          ...badgePill,
                          borderColor: "var(--accent)",
                          color: "var(--accent)",
                        }}
                      >
                        ✓ In your practice
                      </span>
                    ) : null}
                    {(opened.badges ?? []).map((b) => (
                      <span key={b} style={badgePill}>
                        {b}
                      </span>
                    ))}
                    {opened.packTitle ? <span style={badgePill}>{opened.packTitle}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void adopt(opened)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "var(--r-md, 10px)",
                    border: "1px solid var(--accent)",
                    background: busy ? "var(--bg-2)" : "var(--accent)",
                    color: busy ? "var(--ink-mute)" : "var(--on-accent, #14110a)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: busy ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {busy ? "Adopting…" : adoptLabel}
                </button>
              </div>

              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                  lineHeight: 1.65,
                  whiteSpace: "pre-line",
                  maxWidth: 640,
                  margin: "10px 0 0",
                }}
              >
                {opened.summary}
              </p>

              {opened.caution ? (
                <div
                  style={{
                    margin: "14px 0 0",
                    padding: "10px 14px",
                    border: "1px solid var(--warning, var(--accent))",
                    borderRadius: "var(--r-md, 10px)",
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: "var(--ink-soft)",
                  }}
                >
                  <span style={{ ...eyebrow, color: "var(--warning, var(--accent))" }}>
                    Take care
                  </span>
                  <div style={{ marginTop: 4, whiteSpace: "pre-line" }}>{opened.caution}</div>
                </div>
              ) : null}

              {(opened.sections ?? []).map((section) => (
                <div key={section.title} style={{ marginTop: 18 }}>
                  <div style={eyebrow}>{section.title}</div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: "14px 16px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-md, 10px)",
                      background: "var(--bg-2)",
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "var(--ink-soft)",
                      whiteSpace: "pre-line",
                      maxHeight: 340,
                      overflowY: "auto",
                    }}
                  >
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
