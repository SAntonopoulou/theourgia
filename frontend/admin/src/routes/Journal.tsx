/**
 * Journal — the full vault timeline.
 *
 * Composition tracks ``Theourgia Journal.dc.html``:
 *   Topbar    · "Journal" title + "X entries · Y sealed" subtitle +
 *              "New entry" primary action (all via ``useTopbar``).
 *   View tabs · Timeline | By tag | By entity | By tradition | By working.
 *               Timeline ships in this batch; the rest are "coming soon"
 *               placeholders until grouping endpoints land.
 *   Filter bar · Search field + Working/Divination/Synchronicity/Journal
 *                chips with colored dots.
 *   Left col   · Date-grouped entry sections (Today · [Latin day] / Earlier
 *                this week / Earlier this month / Earlier).
 *   Right rail · Content types (counts from currently-loaded entries),
 *                Frequent tags (empty state — tags ship with the editor),
 *                Most cited entities (empty state — citations ship with
 *                Tiptap blocks).
 *
 * Tags + visibility + entity refs aren't on the backend's Entry model
 * yet, so those columns of the entry-row are stubbed. The design's inline
 * "Edit / Archive" buttons aren't present in the .dc.html — those move
 * to the future entry-detail surface.
 */

import {
  type EntryRecord,
  type EntryType,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";
import { createEntry } from "../data/useEntries.js";

// ─── Static maps ────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<EntryType, string> = {
  observation: "Journal",
  ritual: "Working",
  divination: "Divination",
  synchronicity: "Synchronicity",
  capture: "Capture",
  note: "Note",
  ritual_log: "Ritual log",
  dream: "Dream",
  working: "Working",
  magical_record: "Magical record",
  pathworking: "Pathworking",
  scrying: "Scrying",
  body_practice: "Body practice",
  meeting_note: "Meeting note",
  study_note: "Study note",
  liber_resh: "Liber Resh",
  blog_post: "Blog post",
};

const TYPE_COLOR: Record<EntryType, string> = {
  observation: "var(--c-journal)",
  ritual: "var(--c-working)",
  divination: "var(--c-divination)",
  synchronicity: "var(--c-synchronicity)",
  capture: "var(--c-entity)",
  note: "var(--c-journal)",
  ritual_log: "var(--c-working)",
  dream: "var(--c-journal)",
  working: "var(--c-working)",
  magical_record: "var(--c-working)",
  pathworking: "var(--c-journal)",
  scrying: "var(--c-divination)",
  body_practice: "var(--c-journal)",
  meeting_note: "var(--c-journal)",
  study_note: "var(--c-journal)",
  liber_resh: "var(--c-journal)",
  blog_post: "var(--c-journal)",
};

type ChipFilter = "working" | "divination" | "synchronicity" | "journal";

const CHIP_FILTERS: { key: ChipFilter; label: string; color: string; type: EntryType }[] = [
  { key: "working", label: "Working", color: "var(--c-working)", type: "ritual" },
  { key: "divination", label: "Divination", color: "var(--c-divination)", type: "divination" },
  {
    key: "synchronicity",
    label: "Synchronicity",
    color: "var(--c-synchronicity)",
    type: "synchronicity",
  },
  { key: "journal", label: "Journal", color: "var(--c-journal)", type: "observation" },
];

type JournalView = "timeline" | "tags" | "entities" | "traditions" | "workings";

const VIEW_TABS: { key: JournalView; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "tags", label: "By tag" },
  { key: "entities", label: "By entity" },
  { key: "traditions", label: "By tradition" },
  { key: "workings", label: "By working" },
];

const LATIN_DAY: Record<number, string> = {
  0: "Dies Solis",
  1: "Dies Lunae",
  2: "Dies Martis",
  3: "Dies Mercurii",
  4: "Dies Jovis",
  5: "Dies Veneris",
  6: "Dies Saturni",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24)
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) {
    const wd = d.toLocaleDateString(undefined, { weekday: "short" });
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${wd} · ${time}`;
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

type DateGroupKey = "today" | "thisWeek" | "thisMonth" | "earlier";

function dateGroupOf(iso: string, now: Date): DateGroupKey {
  const d = new Date(iso);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (d.getTime() >= start.getTime()) return "today";

  // This week = within the last 7 days but before today.
  const weekAgo = new Date(start);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d.getTime() >= weekAgo.getTime()) return "thisWeek";

  // This month = same calendar month.
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
    return "thisMonth";
  }
  return "earlier";
}

function groupHeading(key: DateGroupKey, now: Date): string {
  switch (key) {
    case "today":
      return `Today · ${LATIN_DAY[now.getDay()] ?? ""}`.trim();
    case "thisWeek":
      return "Earlier this week";
    case "thisMonth":
      return `Earlier · ${now.toLocaleDateString(undefined, { month: "long" })}`;
    case "earlier":
      return "Earlier";
  }
}

// ─── View tabs ──────────────────────────────────────────────────────────────

function ViewTabs({
  view,
  onChange,
}: {
  view: JournalView;
  onChange: (v: JournalView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Journal view"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderBottom: "1px solid var(--line)",
        marginBottom: 20,
      }}
    >
      {VIEW_TABS.map((tab) => {
        const selected = tab.key === view;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "10px 14px",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: selected ? "var(--ink)" : "var(--ink-mute)",
              background: "transparent",
              borderBottom: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search,
  onSearchChange,
  active,
  onToggle,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  active: Set<ChipFilter>;
  onToggle: (key: ChipFilter) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg-2)",
          flex: "1 1 200px",
          minWidth: 0,
          color: "var(--ink-mute)",
          cursor: "text",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search entries…"
          aria-label="Search entries"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}
        />
      </label>
      {CHIP_FILTERS.map((chip) => {
        const selected = active.has(chip.key);
        return (
          <button
            key={chip.key}
            type="button"
            data-chip
            onClick={() => onToggle(chip.key)}
            aria-pressed={selected}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
              borderRadius: "var(--r-pill, 999px)",
              background: selected ? "var(--accent-soft)" : "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: selected ? "var(--ink)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: chip.color,
              }}
              aria-hidden="true"
            />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Entry row + grouped section ───────────────────────────────────────────

function EntryRow({
  entry,
  isLast,
  now,
  onOpen,
}: {
  entry: EntryRecord;
  isLast: boolean;
  now: Date;
  onOpen: (id: string) => void;
}) {
  const color = TYPE_COLOR[entry.type];
  const label = TYPE_LABEL[entry.type];
  return (
    <article
      className="entry-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(entry.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(entry.id);
        }
      }}
      style={{
        display: "flex",
        gap: 14,
        padding: "15px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--line)",
        transition: "background-color 0.15s ease",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 3, borderRadius: 3, background: color, flex: "none" }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {relativeTime(entry.created_at, now)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 18,
            marginBottom: 3,
          }}
        >
          {entry.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {entry.excerpt || <em style={{ color: "var(--ink-mute)" }}>(no excerpt)</em>}
        </div>
        {/* Tag chips + visibility marker — both stubbed until backend supports
            tags + ACL. Empty row keeps the layout honest. */}
      </div>
    </article>
  );
}

function GroupedSection({
  heading,
  entries,
  now,
  onOpen,
}: {
  heading: string;
  entries: EntryRecord[];
  now: Date;
  onOpen: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section style={{ marginBottom: 26 }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          margin: "0 0 10px",
        }}
      >
        {heading}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        {entries.map((entry, i) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            now={now}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Right rail facets ──────────────────────────────────────────────────────

const facetCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "16px 18px",
};

const facetLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function ContentTypesFacet({ entries }: { entries: EntryRecord[] }) {
  const counts = useMemo(() => {
    const c: Record<EntryType, number> = {
      observation: 0,
      ritual: 0,
      divination: 0,
      synchronicity: 0,
      capture: 0,
      note: 0,
      ritual_log: 0,
      dream: 0,
      working: 0,
      magical_record: 0,
      pathworking: 0,
      scrying: 0,
      body_practice: 0,
      meeting_note: 0,
      study_note: 0,
      liber_resh: 0,
      blog_post: 0,
    };
    for (const e of entries) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [entries]);

  const rows: { type: EntryType; label: string; color: string; count: number }[] = [
    { type: "observation", label: "Journal", color: "var(--c-journal)", count: counts.observation },
    { type: "ritual", label: "Working", color: "var(--c-working)", count: counts.ritual },
    {
      type: "divination",
      label: "Divination",
      color: "var(--c-divination)",
      count: counts.divination,
    },
    {
      type: "synchronicity",
      label: "Synchronicity",
      color: "var(--c-synchronicity)",
      count: counts.synchronicity,
    },
    { type: "capture", label: "Capture", color: "var(--c-entity)", count: counts.capture },
  ];

  return (
    <article style={facetCardStyle}>
      <div style={facetLabel}>Content types</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--ink-soft)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: row.color,
              }}
              aria-hidden="true"
            />
            {row.label}
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function FrequentTagsFacet() {
  return (
    <article style={facetCardStyle}>
      <div style={facetLabel}>Frequent tags</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        Tags appear when entries can carry them — ships with the editor surface.
      </div>
    </article>
  );
}

function MostCitedEntitiesFacet() {
  return (
    <article style={facetCardStyle}>
      <div style={facetLabel}>Most cited entities</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        Citation aggregation lights up when entries link to entities — ships with the entityRef
        Tiptap block.
      </div>
    </article>
  );
}

// ─── Topbar action ──────────────────────────────────────────────────────────

function NewEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent)",
        color: "var(--accent-ink, white)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "pointer",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      New entry
    </button>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        background: "var(--bg-2)",
        marginBottom: 26,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={`skel-${i}`}
          style={{
            display: "flex",
            gap: 14,
            padding: "15px 18px",
            borderBottom: i < 2 ? "1px solid var(--line)" : "none",
          }}
        >
          <span style={{ width: 3, borderRadius: 3, background: "var(--line)", flex: "none" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton kind="text" width={120} />
            <Skeleton kind="text" width={260} />
            <Skeleton kind="text" width="100%" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Journal() {
  const [view, setView] = useState<JournalView>("timeline");
  const [search, setSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<ChipFilter>>(new Set());
  const navigate = useNavigate();

  const entries = useApiCall<EntryRecord[]>((signal) => apiMethods.listEntries({ signal }));

  // Live counts for the topbar subtitle. Sealed = visibility marker; until ACL
  // lands we don't know — show only the total.
  const total = entries.data?.length ?? 0;
  const subtitle = `${total.toLocaleString()} entries`;

  async function beginNewEntry(): Promise<void> {
    try {
      const created = await createEntry({
        title: "Untitled entry",
        type: "observation",
        excerpt: "",
        glyph: "feather",
      });
      navigate(`/editor/${created.id}`);
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Could not create entry",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function openEntry(id: string): void {
    navigate(`/editor/${id}`);
  }

  useTopbar(
    () => ({
      title: "Journal",
      subtitle,
      after: <NewEntryButton onClick={() => void beginNewEntry()} />,
    }),
    [subtitle],
  );

  function toggleChip(key: ChipFilter): void {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Filter by chips (any-of) then by search term (case-insensitive on title +
  // excerpt). Empty chip set = show all types.
  const filtered = useMemo(() => {
    const rows = entries.data ?? [];
    const allowedTypes =
      activeChips.size === 0
        ? null
        : new Set(
            Array.from(activeChips).map(
              (k) => CHIP_FILTERS.find((c) => c.key === k)?.type as EntryType,
            ),
          );
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (allowedTypes && !allowedTypes.has(row.type)) return false;
      if (q.length > 0) {
        const haystack = `${row.title} ${row.excerpt}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries.data, activeChips, search]);

  const now = useMemo(() => new Date(), []);

  const grouped = useMemo(() => {
    const buckets: Record<DateGroupKey, EntryRecord[]> = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      earlier: [],
    };
    for (const e of filtered) {
      const g = dateGroupOf(e.created_at, now);
      buckets[g].push(e);
    }
    return buckets;
  }, [filtered, now]);

  const showComingSoon =
    view !== "timeline" && (entries.status !== "loading" || filtered.length > 0);

  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <ViewTabs view={view} onChange={setView} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
          {/* LEFT */}
          <div style={{ flex: "3 1 460px", minWidth: 0 }}>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              active={activeChips}
              onToggle={toggleChip}
            />

            {showComingSoon ? (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "28px 24px",
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink-mute)",
                  lineHeight: 1.55,
                }}
              >
                "{VIEW_TABS.find((t) => t.key === view)?.label}" arrives with the aggregation
                endpoints. Use the Timeline view in the meantime.
              </div>
            ) : entries.status === "loading" ? (
              <ListSkeleton />
            ) : entries.status === "error" ? (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "20px 24px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                }}
              >
                Couldn't load entries: {entries.error?.message ?? "unknown error from the API."}{" "}
                <button
                  type="button"
                  onClick={() => void entries.refresh()}
                  style={{
                    color: "var(--accent)",
                    background: "transparent",
                    border: "none",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    cursor: "pointer",
                    padding: 0,
                    marginLeft: 6,
                    textDecoration: "underline",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "32px 24px",
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-mute)",
                }}
              >
                {entries.data?.length === 0
                  ? "No entries yet. Capture your first observation to populate the vault."
                  : "No entries match the current filters."}
              </div>
            ) : (
              <>
                <GroupedSection
                  heading={groupHeading("today", now)}
                  entries={grouped.today}
                  now={now}
                  onOpen={openEntry}
                />
                <GroupedSection
                  heading={groupHeading("thisWeek", now)}
                  entries={grouped.thisWeek}
                  now={now}
                  onOpen={openEntry}
                />
                <GroupedSection
                  heading={groupHeading("thisMonth", now)}
                  entries={grouped.thisMonth}
                  now={now}
                  onOpen={openEntry}
                />
                <GroupedSection
                  heading={groupHeading("earlier", now)}
                  entries={grouped.earlier}
                  now={now}
                  onOpen={openEntry}
                />
              </>
            )}
          </div>

          {/* RIGHT RAIL */}
          <aside
            style={{
              flex: "1 1 260px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              minWidth: 0,
            }}
          >
            <ContentTypesFacet entries={entries.data ?? []} />
            <FrequentTagsFacet />
            <MostCitedEntitiesFacet />
          </aside>
        </div>
      </div>
    </>
  );
}
