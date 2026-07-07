/**
 * VocesLibrarySurface — H06 §S6.4 (Voces Magicae Library Browser).
 *
 * Composes the bundled + personal voces list with filter + detail
 * drawer. Wires to `apiMethods.listBundledVoces()` (shipped in B107)
 * and `apiMethods.listVoces()` for the personal side. Pure browse +
 * detail view; fork is the committed-make moment that POSTs to
 * `/api/v1/voces/fork-bundled`.
 *
 * Honesty rules (H06):
 *   • Citation `‡` on every bundled voce — never absent.
 *   • Tradition tag is heuristically derived from the citation
 *     text until the Phase 08 backend authoritatively stores it.
 *     The heuristic is in `copy.ts > deriveTradition`.
 *   • Community recordings carry a disclaimer: "represent how
 *     individual practitioners voice this voce — not a canonical
 *     authority."
 *   • The "Suggest correction" modal explicitly notes its review
 *     pipeline ships with Phase 14. Honest about deferral.
 *   • Personal voces never count in shared aggregations
 *     (downstream concern; this surface just labels them).
 */

import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  VL_ASSOCIATIONS_EYEBROW,
  VL_BUNDLED_TITLE,
  VL_DRAWER_BUNDLED_LABEL,
  VL_DRAWER_PERSONAL_LABEL,
  VL_EMPTY_BODY,
  VL_EMPTY_HEADING,
  VL_FORK_LABEL,
  VL_INSERT_LABEL,
  VL_NO_RECORDING,
  VL_PERSONAL_BADGE,
  VL_PLAY_LABEL,
  VL_PRIVATE_NOTE_EYEBROW,
  VL_PRIVATE_NOTE_PLACEHOLDER,
  VL_PRIVATE_NOTE_TAIL,
  VL_RECORDINGS_DISCLAIMER,
  VL_RECORDINGS_EYEBROW,
  VL_SEARCH_PLACEHOLDER,
  VL_SLOW_LABEL,
  VL_SOURCE_LABELS,
  VL_SUGGEST_CANCEL,
  VL_SUGGEST_DETAIL_LABEL,
  VL_SUGGEST_DETAIL_PLACEHOLDER,
  VL_SUGGEST_EMAIL_LABEL_PREFIX,
  VL_SUGGEST_EMAIL_LABEL_TAIL,
  VL_SUGGEST_EMAIL_PLACEHOLDER,
  VL_SUGGEST_FOOTER,
  VL_SUGGEST_LABEL,
  VL_SUGGEST_QUEUE,
  VL_SUGGEST_REASONS,
  VL_SUGGEST_REASON_LABEL,
  VL_SUGGEST_TITLE,
  VL_TOPBAR_SUBTITLE,
  VL_TOPBAR_TITLE,
  VL_TRADITION_LABELS,
  communityRecordingLabel,
  deriveTradition,
  personalRecordingLabel,
} from "./copy.js";

// ── Shared types (mirror backend wire shape from B107) ─────────────

export interface VoceLibraryEntry {
  /** Bundled fixture id when bundled=true, else the user-vault id. */
  id: string;
  /** Source-script text (e.g. ΕΛΘΕ ΜΟΙ ...). */
  source_text: string;
  /** Best-effort Latin transliteration. */
  transliteration: string | null;
  /** IPA, approximate when reconstruction is uncertain. */
  ipa: string | null;
  /** PD citation. */
  source_citation: string;
  /** True for the canonical PD corpus; false for practitioner forks. */
  bundled: boolean;
  /** Planetary correspondences (sun · moon · …). */
  planetary_associations: string[];
  /** Elemental correspondences (fire · water · air · earth · aether). */
  elemental_associations: string[];
  /** Community recordings count (bundled) or personal recordings list
   *  length (personal). The surface labels both as "recordings". */
  recording_count: number;
}

const PLANET_GLYPH: Record<string, string> = {
  saturn: "♄",
  jupiter: "♃",
  mars: "♂",
  sun: "☉",
  venus: "♀",
  mercury: "☿",
  moon: "☽",
};

const ELEMENT_GLYPH: Record<string, string> = {
  fire: "🜂",
  water: "🜄",
  air: "🜁",
  earth: "🜃",
  aether: "🜀",
};

// ── Styles ─────────────────────────────────────────────────────────

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

const FILTER_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "14px 26px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const SEARCH_WRAP: CSSProperties = {
  position: "relative",
  flex: "0 1 240px",
};

const SEARCH_ICON: CSSProperties = {
  position: "absolute",
  left: 11,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--ink-mute)",
};

const SEARCH_INPUT: CSSProperties = {
  width: "100%",
  padding: "9px 12px 9px 33px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
};

const TRAD_ROW: CSSProperties = {
  display: "flex",
  gap: 5,
  overflowX: "auto",
  flex: 1,
  minWidth: 0,
};

const SOURCE_GROUP: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: 8,
  background: "var(--bg-2)",
  flex: "none",
};

const LIST_WRAP: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "16px 24px 50px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "15px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
};

const DRAWER_SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "flex",
  justifyContent: "flex-end",
};

const DRAWER_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.5)",
};

const DRAWER_PANEL: CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
  height: "100%",
  overflowY: "auto",
  background: "var(--bg)",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line-2)",
  boxShadow: "-2px 0 30px rgba(0,0,0,.4)",
};

const MODAL_SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const MODAL_PANEL: CSSProperties = {
  position: "relative",
  width: "min(440px, 100%)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px",
};

// ── Icons ──────────────────────────────────────────────────────────

function SearchIcon(): ReactElement {
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
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PlayIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ForkIcon(): ReactElement {
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
      <path d="M7 4v16l5-3 5 3V4z" />
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
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function EditIcon(): ReactElement {
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
      <path d="M5 19l2.5-.6L19 7a2 2 0 0 0-3-3L4.6 15.5 4 18z" />
    </svg>
  );
}

function CloseIcon(): ReactElement {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────

export interface VocesLibrarySurfaceProps {
  /** All voces to display (bundled + personal merged). The route is
   *  responsible for hydrating from `listBundledVoces()` and
   *  `listVoces()`. */
  voces: readonly VoceLibraryEntry[];
  /** Fired when the practitioner taps "Fork into my library" on a
   *  bundled voce. The route POSTs to /api/v1/voces/fork-bundled. */
  onFork?: (bundledId: string) => void;
  /** Fired when the practitioner inserts a voce reference into the
   *  current draft (the editor's voce block — editor block
   *  embed parity rule). */
  onInsertIntoDraft?: (voceId: string) => void;
  /** Fired when the practitioner queues a correction suggestion. */
  onSuggestCorrection?: (payload: {
    voceId: string;
    reason: string;
    detail: string;
    email: string;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Helpers ────────────────────────────────────────────────────────

function chipEls(planets: string[], elements: string[]): ReactNode {
  const els: ReactNode[] = [];
  planets.forEach((p, i) => {
    if (!PLANET_GLYPH[p]) return;
    els.push(
      <span
        key={`p${i}`}
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 15,
          color: "var(--accent)",
        }}
        title={p}
      >
        {PLANET_GLYPH[p]}
      </span>,
    );
  });
  elements.forEach((e, i) => {
    if (!ELEMENT_GLYPH[e]) return;
    els.push(
      <span
        key={`e${i}`}
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 14,
          color: "var(--ink-soft)",
        }}
        title={e}
      >
        {ELEMENT_GLYPH[e]}
      </span>,
    );
  });
  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{els}</span>
  );
}

function recordingLabel(v: VoceLibraryEntry): string {
  if (v.recording_count === 0) return VL_NO_RECORDING;
  return v.bundled
    ? communityRecordingLabel(v.recording_count)
    : personalRecordingLabel(v.recording_count);
}

// ── Surface ────────────────────────────────────────────────────────

export function VocesLibrarySurface({
  voces,
  onFork,
  onInsertIntoDraft,
  onSuggestCorrection,
  className,
  style,
}: VocesLibrarySurfaceProps) {
  const [search, setSearch] = useState("");
  const [tradition, setTradition] = useState("all");
  const [source, setSource] = useState<"all" | "bundled" | "personal">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);

  const voceTraditions = useMemo(
    () =>
      voces.map((v) => ({
        ...v,
        tradition: deriveTradition(v.source_citation),
      })),
    [voces],
  );

  // The chip set is the union of "all" + every tradition that
  // appears in the data. Keeps the chip row honest — no empty
  // categories.
  const availableTraditions = useMemo(() => {
    const set = new Set<string>(["all"]);
    voceTraditions.forEach((v) => set.add(v.tradition));
    return Array.from(set);
  }, [voceTraditions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voceTraditions.filter((v) => {
      if (tradition !== "all" && v.tradition !== tradition) return false;
      if (source === "bundled" && !v.bundled) return false;
      if (source === "personal" && v.bundled) return false;
      if (q === "") return true;
      return (
        v.source_text.toLowerCase().includes(q) ||
        (v.transliteration ?? "").toLowerCase().includes(q) ||
        (v.ipa ?? "").toLowerCase().includes(q)
      );
    });
  }, [voceTraditions, search, tradition, source]);

  const selected = useMemo(
    () => voceTraditions.find((v) => v.id === selectedId) ?? null,
    [voceTraditions, selectedId],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const openDrawer = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  return (
    <div
      data-component="voces-library-surface"
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
            {VL_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {VL_TOPBAR_SUBTITLE}
          </div>
        </div>
      </header>

      <div
        className="scroll"
        style={{ overflowY: "auto", minHeight: 0, padding: 0 }}
      >
        <div style={FILTER_ROW}>
          <div style={SEARCH_WRAP}>
            <span style={SEARCH_ICON}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={VL_SEARCH_PLACEHOLDER}
              aria-label={VL_SEARCH_PLACEHOLDER}
              style={SEARCH_INPUT}
              data-voce-search
            />
          </div>

          <div
            className="scroll"
            role="group"
            aria-label="Tradition"
            style={TRAD_ROW}
          >
            {availableTraditions.map((t) => {
              const on = tradition === t;
              const baseStyle: CSSProperties = {
                padding: "6px 12px",
                borderRadius: 20,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? "var(--accent)" : "var(--line)",
                background: on ? "var(--accent-soft)" : "var(--bg-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: on ? "var(--ink)" : "var(--ink-mute)",
                whiteSpace: "nowrap",
                flex: "none",
                cursor: "pointer",
              };
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  data-tradition={t}
                  onClick={() => setTradition(t)}
                  style={baseStyle}
                >
                  {VL_TRADITION_LABELS[t] ?? t}
                </button>
              );
            })}
          </div>

          <div role="group" aria-label="Source" style={SOURCE_GROUP}>
            {(["all", "bundled", "personal"] as const).map((s) => {
              const on = source === s;
              const baseStyle: CSSProperties = {
                padding: "5px 12px",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: on ? "var(--ink)" : "var(--ink-mute)",
                background: on ? "var(--accent-soft)" : "transparent",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? "var(--line-2)" : "transparent",
                borderRadius: 6,
                cursor: "pointer",
              };
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  data-source={s}
                  onClick={() => setSource(s)}
                  style={baseStyle}
                >
                  {VL_SOURCE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            data-voces-empty
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
                margin: 0,
                color: "var(--ink-soft)",
              }}
            >
              {VL_EMPTY_HEADING}
            </p>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                marginTop: 10,
              }}
            >
              {VL_EMPTY_BODY}
            </p>
          </div>
        ) : (
          <div data-voces-list style={LIST_WRAP}>
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                data-voce-id={v.id}
                onClick={() => openDrawer(v.id)}
                style={ROW_STYLE}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {v.source_text}
                    </span>
                    {v.bundled ? (
                      <span
                        title={VL_BUNDLED_TITLE}
                        aria-label={`Citation: ${v.source_citation}`}
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
                          flex: "none",
                        }}
                      >
                        ‡
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--info)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line-2)",
                          borderRadius: 20,
                          padding: "1px 7px",
                          flex: "none",
                        }}
                      >
                        {VL_PERSONAL_BADGE}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 13.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {v.transliteration ?? "—"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: "none",
                  }}
                >
                  {chipEls(v.planetary_associations, v.elemental_associations)}
                </div>
                <div
                  style={{
                    flex: "none",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color:
                      v.recording_count > 0
                        ? "var(--ink-soft)"
                        : "var(--ink-mute)",
                    width: 140,
                    textAlign: "right",
                  }}
                >
                  {recordingLabel(v)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {drawerOpen && selected ? (
        <VoceDetailDrawer
          voce={selected}
          onClose={() => setDrawerOpen(false)}
          onFork={() => {
            onFork?.(selected.id);
            setDrawerOpen(false);
          }}
          onInsert={() => {
            onInsertIntoDraft?.(selected.id);
          }}
          onSuggest={() => setCorrectOpen(true)}
        />
      ) : null}

      {correctOpen && selected ? (
        <SuggestCorrectionModal
          voce={selected}
          onClose={() => setCorrectOpen(false)}
          onSubmit={(payload) => {
            onSuggestCorrection?.({
              voceId: selected.id,
              ...payload,
            });
            setCorrectOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────

interface VoceDetailDrawerProps {
  voce: VoceLibraryEntry;
  onClose: () => void;
  onFork: () => void;
  onInsert: () => void;
  onSuggest: () => void;
}

function VoceDetailDrawer({
  voce,
  onClose,
  onFork,
  onInsert,
  onSuggest,
}: VoceDetailDrawerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voce detail"
      style={DRAWER_SCRIM}
    >
      <div onClick={onClose} style={DRAWER_BG} aria-hidden="true" />
      <div className="scroll" style={DRAWER_PANEL} data-voce-drawer>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 22px",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--line)",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            {voce.bundled ? (
              <span
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
                aria-hidden="true"
              >
                ‡
              </span>
            ) : null}
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {voce.bundled
                ? VL_DRAWER_BUNDLED_LABEL
                : VL_DRAWER_PERSONAL_LABEL}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              color: "var(--ink-mute)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{ padding: "8px 26px 36px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "20px 0 18px",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--line)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 38,
                lineHeight: 1.1,
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              {voce.source_text}
            </div>
            {voce.transliteration ? (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: "var(--ink-soft)",
                  marginBottom: 3,
                }}
              >
                {voce.transliteration}
              </div>
            ) : null}
            {voce.ipa ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  marginBottom: 16,
                }}
              >
                {voce.ipa}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 15px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--accent)",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
                aria-label={VL_PLAY_LABEL}
              >
                <PlayIcon />
                {VL_PLAY_LABEL}
              </button>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                <input
                  type="checkbox"
                  style={{
                    width: 15,
                    height: 15,
                  }}
                />
                {VL_SLOW_LABEL}
              </label>
            </div>
          </div>

          {/* Citation card */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "10px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontFamily: "var(--font-glyph)",
                fontSize: 12,
                flex: "none",
              }}
              aria-hidden="true"
            >
              ‡
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                lineHeight: 1.4,
              }}
            >
              {voce.source_citation}
            </span>
          </div>

          {/* Associations */}
          {voce.planetary_associations.length > 0 ||
          voce.elemental_associations.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 10,
                }}
              >
                {VL_ASSOCIATIONS_EYEBROW}
              </div>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 7 }}
              >
                {voce.planetary_associations.map((p) => (
                  <span
                    key={`p-${p}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 11px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line-2)",
                      borderRadius: 20,
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--font-glyph)",
                        color: "var(--accent)",
                      }}
                    >
                      {PLANET_GLYPH[p] ?? "·"}
                    </span>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
                {voce.elemental_associations.map((e) => (
                  <span
                    key={`e-${e}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 11px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line-2)",
                      borderRadius: 20,
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--font-glyph)",
                      }}
                    >
                      {ELEMENT_GLYPH[e] ?? "·"}
                    </span>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Community recordings (placeholder; B34 audio substrate wires later) */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 10,
              }}
            >
              {VL_RECORDINGS_EYEBROW}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                padding: "8px 12px",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
              }}
            >
              {voce.recording_count > 0
                ? recordingLabel(voce) + " · player wires when the B34 audio substrate ships."
                : VL_NO_RECORDING}
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
                margin: "10px 0 0",
              }}
            >
              {VL_RECORDINGS_DISCLAIMER}
            </p>
          </div>

          {/* Private note (placeholder textarea — wires to vault when Phase 08 backend ships the per-vault personal-notes field) */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 8,
              }}
            >
              {VL_PRIVATE_NOTE_EYEBROW}{" "}
              <span style={{ textTransform: "none", letterSpacing: 0 }}>
                {VL_PRIVATE_NOTE_TAIL}
              </span>
            </div>
            <textarea
              rows={2}
              placeholder={VL_PRIVATE_NOTE_PLACEHOLDER}
              aria-label={VL_PRIVATE_NOTE_EYEBROW}
              style={{
                width: "100%",
                padding: "11px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>

          {/* Footer CTAs */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 18,
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--line)",
            }}
          >
            {voce.bundled ? (
              <button
                type="button"
                onClick={onFork}
                data-action="fork"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
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
                <ForkIcon />
                {VL_FORK_LABEL}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onInsert}
              data-action="insert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <InsertIcon />
              {VL_INSERT_LABEL}
            </button>
            {voce.bundled ? (
              <button
                type="button"
                onClick={onSuggest}
                data-action="suggest"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "transparent",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <EditIcon />
                {VL_SUGGEST_LABEL}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Suggest Correction modal ───────────────────────────────────────

interface SuggestCorrectionModalProps {
  voce: VoceLibraryEntry;
  onClose: () => void;
  onSubmit: (payload: {
    reason: string;
    detail: string;
    email: string;
  }) => void;
}

function SuggestCorrectionModal({
  onClose,
  onSubmit,
}: SuggestCorrectionModalProps) {
  const [reason, setReason] = useState(VL_SUGGEST_REASONS[0]!);
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={VL_SUGGEST_TITLE}
      style={MODAL_SCRIM}
    >
      <div onClick={onClose} style={DRAWER_BG} aria-hidden="true" />
      <div style={MODAL_PANEL}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            margin: "0 0 16px",
          }}
        >
          {VL_SUGGEST_TITLE}
        </h2>
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 7,
          }}
        >
          {VL_SUGGEST_REASON_LABEL}
        </label>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {VL_SUGGEST_REASONS.map((r) => {
            const on = reason === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setReason(r)}
                data-reason={r}
                style={{
                  padding: "7px 13px",
                  borderRadius: "var(--r-md)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--accent)" : "var(--line-2)",
                  background: on ? "var(--accent-soft)" : "var(--bg-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: on ? "var(--ink)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
        <label
          htmlFor="vl-correct-detail"
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 7,
          }}
        >
          {VL_SUGGEST_DETAIL_LABEL}
        </label>
        <textarea
          id="vl-correct-detail"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={VL_SUGGEST_DETAIL_PLACEHOLDER}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            resize: "vertical",
            marginBottom: 14,
          }}
        />
        <label
          htmlFor="vl-correct-email"
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 7,
          }}
        >
          {VL_SUGGEST_EMAIL_LABEL_PREFIX}{" "}
          <span style={{ color: "var(--ink-mute)" }}>
            {VL_SUGGEST_EMAIL_LABEL_TAIL}
          </span>
        </label>
        <input
          id="vl-correct-email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={VL_SUGGEST_EMAIL_PLACEHOLDER}
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
            marginBottom: 18,
          }}
        />
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
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {VL_SUGGEST_CANCEL}
          </button>
          <button
            type="button"
            data-action="queue-correction"
            onClick={() => onSubmit({ reason, detail, email })}
            style={{
              flex: 1.4,
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
            {VL_SUGGEST_QUEUE}
          </button>
        </div>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            textAlign: "center",
            margin: "12px 0 0",
          }}
        >
          {VL_SUGGEST_FOOTER}
        </p>
      </div>
    </div>
  );
}
