/**
 * Library — the magician's reading: books and primary sources.
 *
 * Phase 02 ships the minimal record: title, author, year, tradition,
 * notes. Reading status, passage notes, and citation graph land in
 * Phase 03.
 */

import {
  Badge,
  type BookRecord,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Glyph,
  type GlyphName,
  NumberInput,
  SegmentedControl,
  Select,
  Skeleton,
  TextArea,
  TextInput,
  Toast,
  useApiCall,
} from "@theourgia/shared";
import { useState } from "react";

import { apiMethods } from "../data/api.js";

type TraditionFilter = "all" | "hermetic" | "hellenic" | "thelemic" | "taoist" | "other";

const TRADITION_OPTIONS: ReadonlyArray<{ value: TraditionFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "hermetic", label: "Hermetic" },
  { value: "hellenic", label: "Hellenic" },
  { value: "thelemic", label: "Thelemic" },
  { value: "taoist", label: "Taoist" },
  { value: "other", label: "Other" },
];

const TRADITION_SELECT: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "—" },
  { value: "hermetic", label: "Hermetic" },
  { value: "hellenic", label: "Hellenic" },
  { value: "thelemic", label: "Thelemic" },
  { value: "taoist", label: "Taoist" },
  { value: "other", label: "Other" },
];

function BookEntry({
  book,
  onArchive,
}: {
  book: BookRecord;
  onArchive: (book: BookRecord) => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", gap: "var(--space-3, 12px)" }}>
        <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 4 }}>
          <Glyph name={"library" as GlyphName} size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-3, 12px)",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-serif)",
                fontSize: "var(--type-body, 16px)",
                color: "var(--ink)",
              }}
            >
              {book.title}
            </h3>
            {book.tradition ? <Badge tone="trust">{book.tradition}</Badge> : null}
          </div>
          <div
            style={{
              marginTop: 4,
              display: "flex",
              gap: "var(--space-3, 12px)",
              flexWrap: "wrap",
              fontSize: "var(--type-body-sm, 13px)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {book.author ? <span>by {book.author}</span> : null}
            {book.year !== null ? (
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {book.year < 0 ? `${-book.year} BCE` : book.year}
              </span>
            ) : null}
          </div>
          {book.notes ? (
            <p
              style={{
                margin: "var(--space-3, 12px) 0 0 0",
                fontSize: "var(--type-body-sm, 14px)",
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
            >
              {book.notes}
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "var(--space-2, 8px)",
            }}
          >
            <Button size="sm" variant="quiet" onClick={() => onArchive(book)}>
              Archive
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={`skel-${i}`}>
          <div style={{ display: "flex", gap: "var(--space-3, 12px)" }}>
            <Skeleton kind="circle" width={20} height={20} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton kind="text" width={280} />
              <Skeleton kind="text" width={180} />
              <Skeleton kind="text" width="100%" />
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

interface BookDraft {
  title: string;
  author: string;
  year: string;
  tradition: string;
  notes: string;
}

const EMPTY_DRAFT: BookDraft = {
  title: "",
  author: "",
  year: "",
  tradition: "",
  notes: "",
};

function AddBookDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<BookDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    if (draft.title.trim().length < 1) {
      Toast.push({ tone: "warning", title: "Title is required" });
      return;
    }
    setSaving(true);
    try {
      await apiMethods.createBook({
        title: draft.title.trim(),
        author: draft.author.trim(),
        year: draft.year ? Number(draft.year) : null,
        tradition: draft.tradition,
        notes: draft.notes.trim() || null,
      });
      Toast.push({ tone: "success", title: "Book added" });
      setDraft(EMPTY_DRAFT);
      onSaved();
      onClose();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Could not add book",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} side="right" title="Add a book" onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <Field label="Title" required>
          <TextInput
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Author">
          <TextInput
            value={draft.author}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
          />
        </Field>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-3, 12px)",
          }}
        >
          <Field label="Year" hint="Negative for BCE">
            <NumberInput
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
            />
          </Field>
          <Field label="Tradition">
            <Select
              value={draft.tradition}
              onChange={(e) => setDraft({ ...draft, tradition: e.target.value })}
              options={TRADITION_SELECT}
            />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={4}
            placeholder="Brief commentary or context"
          />
        </Field>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2, 8px)",
            marginTop: "var(--space-2, 8px)",
          }}
        >
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            Add
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export function Library() {
  const [filter, setFilter] = useState<TraditionFilter>("all");
  const books = useApiCall<BookRecord[]>((signal) =>
    apiMethods.listBooks({
      signal,
      ...(filter === "all" ? {} : { tradition: filter }),
    }),
  );

  function changeFilter(value: TraditionFilter): void {
    setFilter(value);
    queueMicrotask(() => void books.refresh());
  }

  const [addOpen, setAddOpen] = useState(false);
  const [archiving, setArchiving] = useState<BookRecord | null>(null);
  const [confirmingArchiveTitle, setConfirmingArchiveTitle] = useState(""); // for confirm body when target clears

  async function applyArchive(book: BookRecord): Promise<void> {
    setArchiving(null);
    try {
      await apiMethods.archiveBook(book.id);
      Toast.push({ tone: "success", title: "Archived" });
      await books.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Archive failed",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5, 24px)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-caption, 11px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Vault · reading
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--type-h1, 32px)",
              color: "var(--ink)",
            }}
          >
            Library
          </h1>
          <Button variant="primary" iconStart="library" onClick={() => setAddOpen(true)}>
            Add a book
          </Button>
        </div>
      </header>

      <SegmentedControl
        options={TRADITION_OPTIONS}
        value={filter}
        onChange={changeFilter}
        ariaLabel="Filter by tradition"
        fullWidth
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        {books.status === "loading" ? (
          <ListSkeleton />
        ) : books.status === "error" ? (
          <EmptyState
            glyph="lock"
            title="Couldn't load library"
            body={books.error?.message ?? "Unknown error."}
            action={
              <Button variant="secondary" onClick={() => void books.refresh()}>
                Retry
              </Button>
            }
          />
        ) : books.data && books.data.length > 0 ? (
          books.data.map((book) => (
            <BookEntry
              key={book.id}
              book={book}
              onArchive={(b) => {
                setArchiving(b);
                setConfirmingArchiveTitle(b.title);
              }}
            />
          ))
        ) : (
          <EmptyState
            glyph="library"
            title={filter === "all" ? "No books yet" : `No ${filter} books`}
            body="Catalogue your reading to build the magickal library."
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                Add the first
              </Button>
            }
          />
        )}
      </div>

      <AddBookDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void books.refresh()}
      />

      <ConfirmDialog
        open={archiving !== null}
        tone="destructive"
        title="Archive this book?"
        body={`"${confirmingArchiveTitle}" will be moved to the archive. Restoration ships in Phase 03.`}
        confirmLabel="Archive"
        onConfirm={() => archiving && void applyArchive(archiving)}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
