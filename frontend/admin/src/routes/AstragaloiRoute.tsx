/**
 * Astragaloi — /divination/astragaloi (H12 Sprint F2, Surface 3).
 *
 * Transcription-first: the operator casts the five bones by hand and
 * enters the faces they showed (1/3/4/6 only — rule 68); the machine's
 * RNG sits apart behind a dashed frame and every simulated cast is
 * marked simulated forever (rule 67). The reading renders BOTH
 * channels side by side — the oracle verse and the tetraktys ladder —
 * and the interpretation field belongs to the operator alone: what it
 * means is yours.
 *
 * Wire: POST/GET/PATCH /api/v1/astragaloi/casts ·
 * GET /api/v1/astragaloi/corpus/meta (the drawer shows the corpus'
 * open adjudications and gaps verbatim) · GET /api/v1/verdicts/awaiting
 * for the optional link to a working under covenant.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AstragaloiCastRead,
  type AstragaloiValenceWire,
  type BoneEntry,
  BoneFaceEntry,
  CastHistoryRow,
  CorpusMetaDrawer,
  LadderChannelCard,
  OracleChannelCard,
  OracleTabs,
  type OracleTabsLinkProps,
  SimulatedChip,
  SimulatedThrowBar,
  Toast,
  emptyEntry,
  entryComplete,
  useTopbar,
} from "@theourgia/shared";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function NavLinkAdapter({ to, current, children, style, onClick }: OracleTabsLinkProps) {
  return (
    <NavLink to={to} aria-current={current} style={style} onClick={onClick}>
      {children}
    </NavLink>
  );
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  boxSizing: "border-box",
};

const CHIP = (on: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: "var(--r-pill, 20px)",
  border: `1px solid ${on ? "var(--line-2)" : "var(--line)"}`,
  background: on ? "var(--accent-soft)" : "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: on ? "var(--ink)" : "var(--ink-mute)",
  cursor: "pointer",
  minHeight: 30,
});

const HAND_ICON = (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V6a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5H10a5 5 0 0 1-5-5v-2.5a1.5 1.5 0 0 1 3 0" />
  </svg>
);

type ValenceFilter = "all" | AstragaloiValenceWire | "simulated";

const FILTER_DEFS: ReadonlyArray<{ key: ValenceFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "favourable", label: "Favourable" },
  { key: "cautionary", label: "Cautionary" },
  { key: "unfavourable", label: "Unfavourable" },
  { key: "simulated", label: "Simulated" },
];

export function AstragaloiRoute() {
  useTopbar(
    () => ({ title: "Astragaloi", subtitle: "Five knucklebones — a transcription, not a machine" }),
    [],
  );
  const queryClient = useQueryClient();

  // ── Entry state ──────────────────────────────────────────────────
  const [entry, setEntry] = useState<BoneEntry[]>(emptyEntry());
  const [question, setQuestion] = useState("");
  const [linkedEntryId, setLinkedEntryId] = useState("");
  const [casting, setCasting] = useState(false);

  // ── Result + interpretation ──────────────────────────────────────
  const [selected, setSelected] = useState<AstragaloiCastRead | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [savingInterpretation, setSavingInterpretation] = useState(false);

  // ── History filters (valence / sphere / simulated / date) ────────
  const [filter, setFilter] = useState<ValenceFilter>("all");
  const [sphereFilter, setSphereFilter] = useState("");
  const [sinceFilter, setSinceFilter] = useState("");

  const [metaOpen, setMetaOpen] = useState(false);

  const history = useQuery({
    queryKey: ["astragaloi-casts", filter, sphereFilter, sinceFilter],
    queryFn: ({ signal }) =>
      apiMethods.listAstragaloiCasts({
        ...(filter !== "all" && filter !== "simulated" ? { valence: filter } : {}),
        ...(filter === "simulated" ? { simulated: true } : {}),
        ...(sphereFilter ? { sphere: Number(sphereFilter) } : {}),
        ...(sinceFilter ? { cast_after: new Date(sinceFilter).toISOString() } : {}),
        signal,
      }),
  });

  // Workings under covenant, for the optional intent link.
  const awaiting = useQuery({
    queryKey: ["awaiting-judgment"],
    queryFn: ({ signal }) => apiMethods.listAwaitingJudgment({ signal }),
  });

  const corpusMeta = useQuery({
    queryKey: ["astragaloi-corpus-meta"],
    queryFn: ({ signal }) => apiMethods.getAstragaloiCorpusMeta({ signal }),
    enabled: metaOpen,
  });

  async function recordCast(simulate: boolean): Promise<void> {
    if (casting) return;
    if (!simulate && !entryComplete(entry)) return;
    setCasting(true);
    try {
      const cast = await apiMethods.createAstragaloiCast({
        ...(simulate ? { simulate: true } : { faces: [...entry] as (1 | 3 | 4 | 6)[] }),
        ...(question.trim() ? { question: question.trim() } : {}),
        ...(linkedEntryId ? { entry_id: linkedEntryId } : {}),
      });
      setSelected(cast);
      setInterpretation(cast.interpretation ?? "");
      if (!simulate) setEntry(emptyEntry());
      await queryClient.invalidateQueries({ queryKey: ["astragaloi-casts"] });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The cast was not recorded",
        body: e instanceof Error ? e.message : "Try again — nothing was saved.",
      });
    } finally {
      setCasting(false);
    }
  }

  async function saveInterpretation(): Promise<void> {
    if (!selected || savingInterpretation) return;
    setSavingInterpretation(true);
    try {
      const updated = await apiMethods.updateAstragaloiCast(selected.id, {
        interpretation: interpretation.trim() ? interpretation.trim() : null,
      });
      setSelected(updated);
      Toast.push({ tone: "success", title: "Your reading is saved" });
      await queryClient.invalidateQueries({ queryKey: ["astragaloi-casts"] });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Could not save your reading",
        body: e instanceof Error ? e.message : "Try again — the record was not changed.",
      });
    } finally {
      setSavingInterpretation(false);
    }
  }

  const complete = entryComplete(entry);
  const casts = Array.isArray(history.data) ? history.data : [];
  const awaitingItems = Array.isArray(awaiting.data) ? awaiting.data : [];

  return (
    <>
      <OracleTabs active="astragaloi" LinkComponent={NavLinkAdapter} />
      <div style={{ maxWidth: 820, margin: "22px auto 0", minWidth: 0 }}>
        {/* Transcription framing */}
        <div
          style={{
            display: "flex",
            gap: 13,
            padding: "15px 17px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--bg-2)",
            marginBottom: 16,
          }}
        >
          <span style={{ display: "flex", color: "var(--accent)", flex: "none", marginTop: 1 }}>
            {HAND_ICON}
          </span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 16,
                color: "var(--ink)",
                marginBottom: 3,
              }}
            >
              Record the throw you made
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.55,
              }}
            >
              Cast the five bones by hand, then enter the faces they showed. This is a transcription
              of something that happened in the room, not a number the machine invented for you.
            </div>
          </div>
          <button
            type="button"
            data-action="corpus-meta"
            onClick={() => setMetaOpen(true)}
            style={{
              marginLeft: "auto",
              alignSelf: "flex-start",
              flex: "none",
              padding: "7px 13px",
              borderRadius: "var(--r-md, 8px)",
              border: "1px solid var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              cursor: "pointer",
              minHeight: 32,
            }}
          >
            About this corpus
          </button>
        </div>

        {/* The question + the optional covenant link */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", ...SECTION_LABEL, marginBottom: 7 }}>
            The question put to the bones
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is being asked…"
              style={{ ...INPUT_STYLE, marginTop: 7 }}
            />
          </label>
          {awaitingItems.length > 0 ? (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                flexWrap: "wrap",
              }}
            >
              Link to a working under covenant (optional)
              <select
                data-intent-link
                value={linkedEntryId}
                onChange={(e) => setLinkedEntryId(e.target.value)}
                style={{
                  padding: "8px 10px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  minHeight: 34,
                  maxWidth: "100%",
                }}
              >
                <option value="">No link</option>
                {awaitingItems.map((w) => (
                  <option key={w.entry_id} value={w.entry_id}>
                    {w.title}
                  </option>
                ))}
              </select>
              {linkedEntryId ? (
                <span
                  data-linked-intent
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "4px 12px",
                    borderRadius: "var(--r-pill, 20px)",
                    border: "1px solid var(--covenant-line)",
                    background: "var(--covenant-soft)",
                    color: "var(--covenant)",
                  }}
                >
                  Linked to a declared intent
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        {/* Bone entry */}
        <section
          style={{
            padding: 18,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--bg-2)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <span style={SECTION_LABEL}>The five faces</span>
            <span
              style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}
            >
              A knucklebone falls on one of four faces — 1, 3, 4 or 6. There is no two and no five.
            </span>
          </div>
          <BoneFaceEntry
            value={entry}
            onPick={(index, face) =>
              setEntry((prev) => {
                const next = [...prev];
                next[index] = face;
                return next;
              })
            }
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 14,
              marginTop: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              data-action="clear"
              onClick={() => setEntry(emptyEntry())}
              style={{
                marginLeft: "auto",
                padding: "9px 15px",
                borderRadius: "var(--r-md, 8px)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                cursor: "pointer",
                minHeight: 36,
              }}
            >
              Clear
            </button>
            <button
              type="button"
              data-action="read-cast"
              disabled={!complete || casting}
              onClick={() => void recordCast(false)}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--r-md, 8px)",
                background: complete ? "var(--accent)" : "var(--bg-3)",
                border: `1px solid ${complete ? "var(--accent)" : "var(--line)"}`,
                color: complete ? "var(--accent-ink)" : "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: complete && !casting ? "pointer" : "not-allowed",
                minHeight: 40,
              }}
            >
              Read the cast
            </button>
          </div>
        </section>

        {/* RNG, clearly separated (rule 67) */}
        <SimulatedThrowBar
          onSimulate={() => void recordCast(true)}
          disabled={casting}
          style={{ marginBottom: 22 }}
        />

        {/* ── The reading: two channels ── */}
        {selected ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={SECTION_LABEL}>The reading — two channels, side by side</span>
              {selected.simulated ? <SimulatedChip /> : null}
            </div>
            <div
              className="td-two"
              data-reading
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 13,
                marginBottom: 16,
              }}
            >
              <OracleChannelCard oracle={selected.oracle} sum={selected.sum} />
              <LadderChannelCard ladder={selected.ladder} sum={selected.sum} />
            </div>

            {/* The operator's own reading */}
            <section
              style={{
                padding: "17px 18px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                background: "var(--bg-2)",
                marginBottom: 22,
              }}
            >
              <div style={{ ...SECTION_LABEL, marginBottom: 4 }}>Your reading</div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginBottom: 11,
                }}
              >
                The two channels above are what the system can say. What it means is yours.
              </div>
              <textarea
                rows={3}
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="What the bones said to you…"
                aria-label="Your reading"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  resize: "vertical",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-action="save-interpretation"
                  disabled={savingInterpretation}
                  onClick={() => void saveInterpretation()}
                  style={{
                    marginLeft: "auto",
                    padding: "10px 18px",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--accent)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: savingInterpretation ? "default" : "pointer",
                    minHeight: 40,
                  }}
                >
                  Save your reading
                </button>
              </div>
            </section>
          </>
        ) : null}

        {/* ── History ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              Earlier casts
            </span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {FILTER_DEFS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  data-filter={f.key}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  style={CHIP(filter === f.key)}
                >
                  {f.label}
                </button>
              ))}
              <select
                data-filter-sphere
                aria-label="Filter by sphere"
                value={sphereFilter}
                onChange={(e) => setSphereFilter(e.target.value)}
                style={{
                  padding: "6px 8px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg-2)",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  minHeight: 30,
                }}
              >
                <option value="">Any sphere</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Sphere {n}
                  </option>
                ))}
              </select>
              <input
                type="date"
                data-filter-since
                aria-label="Cast on or after"
                value={sinceFilter}
                onChange={(e) => setSinceFilter(e.target.value)}
                style={{
                  padding: "5px 8px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg-2)",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  minHeight: 30,
                }}
              />
            </div>
          </div>
          {history.status === "error" ? (
            <div
              style={{
                padding: "14px 16px",
                border: "1px dashed var(--line)",
                borderRadius: "var(--r-md, 8px)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              The history could not be loaded.
            </div>
          ) : casts.length === 0 ? (
            <div
              style={{
                padding: "14px 16px",
                border: "1px dashed var(--line)",
                borderRadius: "var(--r-md, 8px)",
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              No casts recorded
              {filter === "all" && !sphereFilter && !sinceFilter ? " yet" : " under this filter"}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {casts.map((cast) => (
                <CastHistoryRow
                  key={cast.id}
                  cast={cast}
                  selected={selected?.id === cast.id}
                  onSelect={(c) => {
                    setSelected(c);
                    setInterpretation(c.interpretation ?? "");
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CorpusMetaDrawer
        open={metaOpen}
        onClose={() => setMetaOpen(false)}
        meta={corpusMeta.data ?? null}
        loading={corpusMeta.isLoading}
      />
    </>
  );
}
