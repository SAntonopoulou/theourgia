/**
 * Library — the magician's reading.
 *
 * Composition tracks ``Theourgia Library.dc.html``:
 *   Topbar  · "Library" + "X works · Y citations" subtitle + "Add work"
 *             primary action.
 *   Filters · 5 category chips (All / Primary sources / Grimoires /
 *             Scholarship / Periodicals) with colored dots.
 *   Search  · Full-width search field above the list.
 *   List    · Vertical rows with a thick colored "book spine" left bar,
 *             italic title, author/year line, tag chips (language ·
 *             tradition · category), and a right-aligned citation count.
 *   Right   · "Languages" panel (counts derived from records), "Recently
 *             cited" panel (empty until citation tracking ships).
 *
 * Backend currently lacks ``language``, ``category``, and citation
 * tracking. Categories are inferred heuristically from
 * ``tradition`` + ``title`` keywords; languages derive from a light
 * heuristic on title characters until the dedicated field lands.
 * Citation counts render as "—" until the citation graph is built.
 */

import {
  type BookRecord,
  type CreateBookInput,
  Drawer,
  Field,
  NumberInput,
  Select,
  Skeleton,
  TextArea,
  TextInput,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

// ─── Categories ─────────────────────────────────────────────────────────────

type Category = "primary" | "grimoire" | "scholarship" | "periodical";
type CategoryFilter = "all" | Category;

const CATEGORY_LABEL: Record<Category, string> = {
  primary: "Primary sources",
  grimoire: "Grimoires",
  scholarship: "Scholarship",
  periodical: "Periodicals",
};

const CATEGORY_LABEL_SHORT: Record<Category, string> = {
  primary: "Primary source",
  grimoire: "Grimoire",
  scholarship: "Scholarship",
  periodical: "Periodical",
};

const CATEGORY_COLOR: Record<Category, string> = {
  primary: "var(--c-entity)",
  grimoire: "var(--c-working)",
  scholarship: "var(--c-divination)",
  periodical: "var(--c-synchronicity)",
};

const TRADITION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "—" },
  { value: "hermetic", label: "Hermetic" },
  { value: "hellenic", label: "Hellenic" },
  { value: "thelemic", label: "Thelemic" },
  { value: "neoplatonic", label: "Neoplatonic" },
  { value: "qabalistic", label: "Qabalistic" },
  { value: "goetic", label: "Goetic" },
  { value: "grimoire", label: "Grimoire" },
  { value: "scholarship", label: "Scholarship" },
  { value: "periodical", label: "Periodical" },
  { value: "other", label: "Other" },
];

function classifyBook(book: BookRecord): Category {
  const t = (book.tradition ?? "").toLowerCase();
  const title = (book.title ?? "").toLowerCase();
  if (t.includes("periodical") || /\bequinox|journal|review|annual\b/.test(title)) {
    return "periodical";
  }
  if (t.includes("grimoire") || t.includes("ceremonial") || t.includes("goetic")) {
    return "grimoire";
  }
  if (t.includes("scholar") || t.includes("study") || t.includes("commentary")) {
    return "scholarship";
  }
  return "primary";
}

// ─── Language heuristic ────────────────────────────────────────────────────

function languagesOf(book: BookRecord): string[] {
  const out = new Set<string>();
  const s = `${book.title ?? ""} ${book.author ?? ""}`;
  if (/[α-ωΑ-Ω]/.test(s)) out.add("Greek");
  if (/[֐-׿]/.test(s)) out.add("Hebrew");
  if (/[؀-ۿ]/.test(s)) out.add("Arabic");
  if (/[ऀ-ॿ]/.test(s)) out.add("Devanagari");
  if (/[Ⲁ-⳿]/.test(s)) out.add("Coptic");
  // Bias by tradition keywords.
  const t = (book.tradition ?? "").toLowerCase();
  if (t.includes("latin") || /\b(libri|opera|de )/.test(s)) out.add("Latin");
  // Fallback to English when none detected.
  if (out.size === 0) out.add("English");
  return Array.from(out);
}

// ─── Topbar action ──────────────────────────────────────────────────────────

function AddWorkButton({ onClick }: { onClick: () => void }) {
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
      Add work
    </button>
  );
}

// ─── Category chip filter ───────────────────────────────────────────────────

function CategoryFilters({
  active,
  onChange,
}: {
  active: CategoryFilter;
  onChange: (c: CategoryFilter) => void;
}) {
  const chipStyle = (selected: boolean, color?: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    padding: "7px 13px",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: "var(--r-pill, 999px)",
    cursor: "pointer",
    gap: color ? 7 : 0,
  });
  return (
    <div
      role="tablist"
      aria-label="Library category"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 22,
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "all"}
        onClick={() => onChange("all")}
        style={chipStyle(active === "all")}
      >
        All
      </button>
      {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => {
        const selected = active === cat;
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat)}
            style={chipStyle(selected, CATEGORY_COLOR[cat])}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: CATEGORY_COLOR[cat],
                display: "inline-block",
              }}
            />
            {CATEGORY_LABEL[cat]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Search field ───────────────────────────────────────────────────────────

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-2)",
        marginBottom: 16,
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, author, tradition…"
        aria-label="Search the library"
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
  );
}

// ─── Book row ───────────────────────────────────────────────────────────────

function BookRow({ book, isLast }: { book: BookRecord; isLast: boolean }) {
  const cat = classifyBook(book);
  const color = CATEGORY_COLOR[cat];
  const langs = languagesOf(book);
  const yearLabel =
    book.year != null ? (book.year < 0 ? `${Math.abs(book.year)} BCE` : `${book.year}`) : null;
  const tradLabel =
    book.tradition && book.tradition.length > 0
      ? book.tradition.charAt(0).toUpperCase() + book.tradition.slice(1)
      : null;

  return (
    <article
      className="entry-row"
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--line)",
        transition: "background-color 0.15s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 62,
          borderRadius: 2,
          background: color,
          flex: "none",
          boxShadow: "inset -2px 0 0 rgba(0,0,0,0.25)",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontStyle: "italic",
            fontSize: 18,
            lineHeight: 1.2,
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-soft)",
            margin: "3px 0 7px",
          }}
        >
          {[book.author?.trim(), yearLabel].filter(Boolean).join(" · ") || (
            <em style={{ color: "var(--ink-mute)" }}>(no author)</em>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {langs.map((lang) => (
            <span key={`lang-${lang}`} style={tagChipStyle}>
              {lang}
            </span>
          ))}
          {tradLabel ? <span style={tagChipStyle}>{tradLabel}</span> : null}
          <span style={tagChipStyle}>{CATEGORY_LABEL_SHORT[cat]}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--accent)",
          }}
        >
          —
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
          }}
        >
          citations
        </div>
      </div>
    </article>
  );
}

const tagChipStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  color: "var(--ink-mute)",
  padding: "2px 8px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-pill, 999px)",
};

// ─── Right rail ─────────────────────────────────────────────────────────────

const railCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "16px 18px",
};

const railLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function LanguagesCard({ books }: { books: BookRecord[] }) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of books) {
      for (const lang of languagesOf(b)) {
        counts.set(lang, (counts.get(lang) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [books]);
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>Languages</div>
      {rows.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            lineHeight: 1.55,
          }}
        >
          Language tallies appear as the library grows. Per-book language metadata ships with the
          editor surface.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
          }}
        >
          {rows.map(([lang, count]) => (
            <div key={lang} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {lang}
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function RecentlyCitedCard() {
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>Recently cited</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.55,
        }}
      >
        Citations light up here when entries cite library works — ships with the quoteCitation
        Tiptap block.
      </div>
    </article>
  );
}

// ─── Add-work drawer ────────────────────────────────────────────────────────

function AddBookDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [tradition, setTradition] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setTitle("");
    setAuthor("");
    setYear("");
    setTradition("");
    setNotes("");
  }

  async function submit(): Promise<void> {
    if (title.trim().length === 0) return;
    setSaving(true);
    try {
      const payload: CreateBookInput = {
        title: title.trim().slice(0, 512),
        author: author.trim().slice(0, 256),
        year: year === "" ? null : year,
        tradition: tradition.slice(0, 64),
        notes: notes.trim().length === 0 ? null : notes,
      };
      await apiMethods.createBook(payload);
      Toast.push({ tone: "success", title: "Added to the library" });
      reset();
      onClose();
      onCreated();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't add the work",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} side="right" title="Add a work" width={420} onClose={onClose}>
      <Field label="Title" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Chaldean Oracles"
        />
      </Field>
      <Field label="Author / Editor">
        <TextInput
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="e.g. ed. Ruth Majercik"
        />
      </Field>
      <Field label="Year" hint="Negative for BCE (e.g. -200).">
        <NumberInput
          value={year === "" ? undefined : year}
          onChange={(v) => setYear(typeof v === "number" ? v : "")}
        />
      </Field>
      <Field label="Tradition">
        <Select
          value={tradition}
          onChange={(e) => setTradition(e.target.value)}
          options={[...TRADITION_OPTIONS]}
        />
      </Field>
      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </Field>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 14px",
            borderRadius: "var(--r-md, 8px)",
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || title.trim().length === 0}
          style={{
            padding: "9px 16px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--accent)",
            color: "var(--accent-ink, white)",
            border: "none",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: saving ? "default" : "pointer",
            opacity: saving || title.trim().length === 0 ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
    </Drawer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Library() {
  const [active, setActive] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const books = useApiCall<BookRecord[]>((signal) => apiMethods.listBooks({ signal }));

  const all = books.data ?? [];
  const totalWorks = all.length;
  const subtitle = `${totalWorks.toLocaleString()} works`;

  useTopbar(
    () => ({
      title: "Library",
      subtitle,
      after: <AddWorkButton onClick={() => setAdding(true)} />,
    }),
    [subtitle],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((b) => {
      if (active !== "all" && classifyBook(b) !== active) return false;
      if (q.length === 0) return true;
      const hay = `${b.title} ${b.author ?? ""} ${b.tradition ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [all, active, search]);

  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <CategoryFilters active={active} onChange={setActive} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
          {/* LIST */}
          <div style={{ flex: "3 1 540px", minWidth: 0 }}>
            <SearchField value={search} onChange={setSearch} />

            {books.status === "loading" ? (
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
                {[0, 1, 2].map((i) => (
                  <div
                    key={`book-skel-${i}`}
                    style={{
                      display: "flex",
                      gap: 16,
                      padding: "16px 18px",
                      borderBottom: i < 2 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 62,
                        borderRadius: 2,
                        background: "var(--line)",
                        flex: "none",
                      }}
                    />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <Skeleton kind="text" width={320} />
                      <Skeleton kind="text" width={200} />
                      <Skeleton kind="text" width={260} />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.status === "error" ? (
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
                Couldn't load the library: {books.error?.message ?? "unknown error."}
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
                  lineHeight: 1.6,
                }}
              >
                {totalWorks === 0
                  ? "The library is empty. Add the first work to begin the shelf."
                  : "No works match the current filters."}
              </div>
            ) : (
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
                {filtered.map((book, i) => (
                  <BookRow key={book.id} book={book} isLast={i === filtered.length - 1} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT RAIL */}
          <aside
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <LanguagesCard books={all} />
            <RecentlyCitedCard />
          </aside>
        </div>
      </div>

      <AddBookDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => void books.refresh()}
      />
    </>
  );
}
