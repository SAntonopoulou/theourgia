/**
 * LibraryPicker — modal opened from the QuoteCitationNode NodeView.
 *
 * Lists books from `useEditorData()` and lets the user pick one. On
 * pick, the picker formats a standard citation string in the shape:
 *
 *   `Author, *Title* (Year, edition X)`
 *
 * which is then copied into the node's `citation` attribute.
 *
 * Tradition filter chips match the existing Library surface vocabulary.
 */

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import type { BookRecord } from "../api/types.js";

import { useEditorData } from "./EditorContext.js";

const SCRIM_STYLE: CSSProperties = {
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

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
  maxHeight: "min(640px, 90vh)",
  display: "flex",
  flexDirection: "column",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
};

export function formatCitation(book: BookRecord): string {
  const parts = [
    book.author,
    `*${book.title}*`,
    book.year !== null ? `(${book.year})` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (book: BookRecord, formattedCitation: string) => void;
  /** Override the data context's books. */
  books?: readonly BookRecord[];
}

export function LibraryPicker({ open, onClose, onPick, books: override }: LibraryPickerProps) {
  const ctx = useEditorData();
  const all = override ?? ctx.books ?? [];

  const [query, setQuery] = useState("");
  const [tradition, setTradition] = useState<string | "all">("all");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const traditions = useMemo(() => {
    const s = new Set<string>();
    all.forEach((b) => {
      if (b.tradition) s.add(b.tradition);
    });
    return Array.from(s).sort();
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((b) => {
      if (tradition !== "all" && b.tradition !== tradition) return false;
      if (q === "") return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q)
      );
    });
  }, [all, query, tradition]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick from library"
      data-component="editor-library-picker"
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL_STYLE}>
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, margin: "0 0 4px" }}>
            Pick from library
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", margin: "0 0 14px" }}>
            Select a book to fill the citation field.
          </p>
          <input
            type="text"
            autoFocus
            placeholder="Search by title, author, or ISBN…"
            aria-label="Search library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              outline: "none",
            }}
          />
          {traditions.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <TraditionChip label="All" active={tradition === "all"} onClick={() => setTradition("all")} />
              {traditions.map((t) => (
                <TraditionChip
                  key={t}
                  label={t}
                  active={tradition === t}
                  onClick={() => setTradition(t)}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              {all.length === 0
                ? "Library not loaded — link will be available once the library API is wired."
                : "No matches for the current filter."}
            </div>
          ) : (
            filtered.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => {
                  onPick(book, formatCitation(book));
                  onClose();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>
                  {book.title}
                </span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-soft)" }}>
                  {book.author}
                  {book.year !== null ? ` · ${book.year}` : ""}
                  {book.tradition ? ` · ${book.tradition}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface TraditionChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TraditionChip({ label, active, onClick }: TraditionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}
      style={{
        padding: "4px 10px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--accent)" : "var(--line)",
        borderRadius: "var(--r-pill)",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-soft)",
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
