/**
 * Templates admin — block-template gallery.
 *
 * Port of ``Theourgia Templates.dc.html`` per the per-component ritual.
 * Block templates are saved entry structures the user starts from —
 * a tested set of blocks the Editor opens with. Templates are stored
 * per-vault and (in Phase 14) shareable as bundles.
 *
 * "Templates are starting points, not straitjackets" — the closing
 * line, verbatim.
 */

import { useTopbar } from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { type CSSProperties, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

interface WireTemplate {
  id: string;
  name: string;
  description: string;
  kind: string;
  scope: string;
  default_glyph: string;
  tradition?: string | null;
}

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Category = "Working" | "Divination" | "Journal";
type CategoryFilter = "all" | Category;

interface BlockRow {
  glyph: string;
  label: string;
  type: string;
}

interface Template {
  id: string;
  category: Category;
  color: string;
  glyph: string;
  name: string;
  description: string;
  uses: number;
  structure: BlockRow[];
}

const TEMPLATES: Template[] = [
  {
    id: "evocation",
    category: "Working",
    color: "var(--c-working)",
    glyph: "▲",
    name: "Evocation to visible appearance",
    description: "Full Goetic-style operation: preparation, circle, conjuration, the dialogue, license to depart.",
    uses: 0,
    structure: [
      { glyph: "☉", label: "Election of time & place", type: "meta" },
      { glyph: "▲", label: "The triangle & circle set", type: "note" },
      { glyph: "✶", label: "Conjuration spoken", type: "ritual" },
      { glyph: "☽", label: "The appearance — sensations", type: "sensation" },
      { glyph: "✎", label: "The dialogue, verbatim", type: "log" },
      { glyph: "✓", label: "License to depart & banishing", type: "ritual" },
      { glyph: "❖", label: "Result & doubts", type: "note" },
    ],
  },
  {
    id: "lbrp",
    category: "Working",
    color: "var(--c-working)",
    glyph: "✷",
    name: "Daily LBRP record",
    description: "A terse, repeatable log for the Lesser Banishing — for building a clean dataset over months.",
    uses: 0,
    structure: [
      { glyph: "☉", label: "Date · hour · moon", type: "meta" },
      { glyph: "✷", label: "Quality of performance", type: "rating" },
      { glyph: "☽", label: "Notable sensations", type: "sensation" },
      { glyph: "❖", label: "One line: today’s difference", type: "note" },
    ],
  },
  {
    id: "tarot",
    category: "Divination",
    color: "var(--c-divination)",
    glyph: "☽",
    name: "Tarot reading",
    description: "Question, spread, card-by-card, and the synthesis — with a field to revisit the outcome later.",
    uses: 0,
    structure: [
      { glyph: "❓", label: "The question, precisely", type: "meta" },
      { glyph: "☽", label: "Spread & cards drawn", type: "divination" },
      { glyph: "✎", label: "Card-by-card reading", type: "note" },
      { glyph: "❖", label: "Synthesis", type: "note" },
      { glyph: "⏵", label: "Outcome (revisit)", type: "followup" },
    ],
  },
  {
    id: "scrying",
    category: "Divination",
    color: "var(--c-divination)",
    glyph: "◉",
    name: "Scrying session",
    description: "Skrying log: medium, condition, the vision as it came, and a sober reading after.",
    uses: 0,
    structure: [
      { glyph: "◉", label: "Medium & conditions", type: "meta" },
      { glyph: "☽", label: "The vision, unedited", type: "note" },
      { glyph: "☉", label: "Testing the spirit", type: "ritual" },
      { glyph: "❖", label: "Reading, after", type: "note" },
    ],
  },
  {
    id: "dream",
    category: "Journal",
    color: "var(--c-journal)",
    glyph: "☾",
    name: "Dream record",
    description: "For oneiric work: the dream verbatim before it fades, then symbols and waking links.",
    uses: 0,
    structure: [
      { glyph: "☾", label: "The dream, verbatim", type: "note" },
      { glyph: "✶", label: "Symbols & figures", type: "tags" },
      { glyph: "⚷", label: "Waking correspondences", type: "note" },
    ],
  },
  {
    id: "pathworking",
    category: "Journal",
    color: "var(--c-journal)",
    glyph: "✦",
    name: "Pathworking",
    description: "Guided-vision record across a Tree path: the gate, the journey, what was given.",
    uses: 0,
    structure: [
      { glyph: "✦", label: "Path & gate", type: "meta" },
      { glyph: "☽", label: "The journey", type: "note" },
      { glyph: "❖", label: "What was given", type: "note" },
      { glyph: "✎", label: "To verify against the text", type: "followup" },
    ],
  },
];

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Working", label: "Workings" },
  { key: "Divination", label: "Divination" },
  { key: "Journal", label: "Journal" },
];

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const style: CSSProperties = {
    padding: "6px 13px",
    border: `1px solid ${active ? LINE_2 : LINE}`,
    background: active ? "var(--accent-soft)" : "transparent",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: active ? "var(--ink)" : "var(--ink-soft)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
  return (
    <button type="button" data-cat aria-pressed={active ? "true" : "false"} onClick={onClick} style={style}>
      {label}
    </button>
  );
}

function kindToCategory(kind: string): Category {
  if (kind === "ritual" || kind === "working" || kind === "ritual_log") return "Working";
  if (kind === "divination" || kind === "scrying") return "Divination";
  return "Journal";
}

function backendTemplateToLocal(w: WireTemplate): Template {
  const category = kindToCategory(w.kind);
  const color =
    category === "Working"
      ? "var(--c-working)"
      : category === "Divination"
        ? "var(--c-divination)"
        : "var(--c-journal)";
  return {
    id: w.id,
    category,
    color,
    glyph: w.default_glyph || "❖",
    name: w.name,
    description: w.description || "(no description)",
    uses: 0,
    structure: [],
  };
}

export function Templates() {
  const [cat, setCat] = useState<CategoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0]!.id);

  const query = useQuery({
    queryKey: ["templates"],
    queryFn: async () =>
      (await apiMethods.listTemplates()) as unknown as WireTemplate[],
    staleTime: 30_000,
  });

  const allTemplates = useMemo(() => {
    const backend = (query.data ?? []).map(backendTemplateToLocal);
    // Show user-created templates first, followed by the built-in
    // starters. Once the "New template" button wires to POST /templates,
    // the backend list grows and the starters remain as a starting
    // point.
    return [...backend, ...TEMPLATES];
  }, [query.data]);

  useTopbar(
    () => ({
      title: "Templates",
      subtitle: "Start an entry from a tested structure",
      after: (
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New template
        </button>
      ),
    }),
    [],
  );

  const visible = useMemo(() => {
    if (cat === "all") return allTemplates;
    return allTemplates.filter((t) => t.category === cat);
  }, [cat, allTemplates]);

  const sel = allTemplates.find((t) => t.id === selectedId) ?? allTemplates[0]!;

  return (
    <div className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 26 }}>

        {/* LEFT — gallery */}
        <div style={{ flex: "3 1 520px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
            {FILTERS.map((f) => (
              <FilterChip key={f.key} label={f.label} active={cat === f.key} onClick={() => setCat(f.key)} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {visible.map((t) => {
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={isSelected ? "true" : "false"}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    display: "block",
                    textAlign: "left",
                    padding: 17,
                    border: `1px solid ${isSelected ? "var(--accent)" : LINE}`,
                    borderRadius: "var(--r-lg)",
                    background: isSelected ? "var(--accent-soft)" : "var(--bg-2)",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                    color: "inherit",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE_2;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "var(--r-md)",
                        background: `color-mix(in srgb, ${t.color} 16%, transparent)`,
                        border: `1px solid ${LINE}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-glyph)",
                        color: t.color,
                        fontSize: 18,
                        flex: "none",
                      }}
                      aria-hidden="true"
                    >
                      {t.glyph}
                    </span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
                      {t.category}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.15, color: "var(--ink)", marginBottom: 6 }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.45, color: "var(--ink-mute)" }}>{t.description}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>
                    <span>{t.structure.length} blocks</span>
                    {t.uses > 0 ? (
                      <>
                        <span>·</span>
                        <span>used {t.uses}×</span>
                      </>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — preview of selected */}
        <aside style={{ flex: "1 1 320px", minWidth: 0, position: "sticky", top: 0 }}>
          <div style={{ border: `1px solid ${LINE_2}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "var(--r-md)",
                    background: `color-mix(in srgb, ${sel.color} 16%, transparent)`,
                    border: `1px solid ${LINE_2}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-glyph)",
                    color: sel.color,
                    fontSize: 20,
                    flex: "none",
                  }}
                  aria-hidden="true"
                >
                  {sel.glyph}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.1 }}>{sel.name}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginTop: 2 }}>
                    {sel.category} · {sel.structure.length} blocks
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "18px 20px", background: "var(--bg-sunk)" }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 12,
                }}
              >
                The structure
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {sel.structure.map((b, i) => (
                  <div
                    key={`${b.label}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: `1px solid ${LINE}`,
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-2)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-glyph)", color: sel.color, fontSize: 13, flex: "none" }} aria-hidden="true">{b.glyph}</span>
                    <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-soft)" }}>{b.label}</span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)" }}>{b.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, padding: "16px 20px", borderTop: `1px solid ${LINE}` }}>
              <a
                href="/editor"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 10,
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Use this template
              </a>
              <button
                type="button"
                aria-label="Edit template"
                style={{
                  width: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${LINE_2}`,
                  borderRadius: "var(--r-md)",
                  color: "var(--ink-soft)",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 4l6 6M4 20l1-5L16.5 3.5a2.1 2.1 0 0 1 3 3L8 18z" />
                </svg>
              </button>
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, lineHeight: 1.5, color: "var(--ink-mute)", margin: "14px 4px 0" }}>
            Templates are starting points, not straitjackets. Every block can be moved, removed, or added to once you
            begin.
          </p>
        </aside>
      </div>
    </div>
  );
}
