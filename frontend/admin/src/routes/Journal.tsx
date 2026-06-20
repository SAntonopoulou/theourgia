/**
 * Journal — full entry list with edit / archive.
 *
 * Today's "Recent entries" is a 3-row excerpt; Journal is the full
 * vault. Filter by type, edit titles + excerpts, archive (soft-delete).
 * Rich-content editing (Tiptap with the design's custom blocks) lands
 * when the editor surface ships.
 */

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  type EntryRecord,
  type EntryType,
  Glyph,
  type GlyphName,
  PromptDialog,
  SegmentedControl,
  Skeleton,
  Toast,
  useApiCall,
} from "@theourgia/shared";
import { useState } from "react";

import { apiMethods } from "../data/api.js";
import { createEntry } from "../data/useEntries.js";

type FilterValue = "all" | EntryType;

const FILTER_OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "observation", label: "Observations" },
  { value: "ritual", label: "Rituals" },
  { value: "divination", label: "Divinations" },
  { value: "synchronicity", label: "Synchronicities" },
  { value: "capture", label: "Captures" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function EntryCard({
  entry,
  onEdit,
  onArchive,
}: {
  entry: EntryRecord;
  onEdit: (entry: EntryRecord) => void;
  onArchive: (entry: EntryRecord) => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", gap: "var(--space-3, 12px)" }}>
        <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 4 }}>
          <Glyph name={entry.glyph as GlyphName} size={20} />
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
              {entry.title}
            </h3>
            <Badge tone={typeToTone(entry.type)}>{entry.type}</Badge>
          </div>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "var(--type-body-sm, 14px)",
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {entry.excerpt || <em style={{ color: "var(--ink-mute)" }}>(no excerpt)</em>}
          </p>
          <div
            style={{
              marginTop: "var(--space-2, 8px)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-caption, 11px)",
                color: "var(--ink-mute)",
              }}
            >
              {relativeTime(entry.created_at)}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <Button size="sm" variant="quiet" onClick={() => onEdit(entry)}>
                Edit
              </Button>
              <Button size="sm" variant="quiet" onClick={() => onArchive(entry)}>
                Archive
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function typeToTone(type: EntryType): "info" | "success" | "trust" | "warning" | "neutral" {
  switch (type) {
    case "ritual":
      return "success";
    case "divination":
      return "trust";
    case "synchronicity":
      return "info";
    case "capture":
      return "warning";
    default:
      return "neutral";
  }
}

function ListSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={`skel-${i}`}>
          <div style={{ display: "flex", gap: "var(--space-3, 12px)" }}>
            <Skeleton kind="circle" width={20} height={20} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton kind="text" width={240} />
              <Skeleton kind="text" width="100%" />
              <Skeleton kind="text" width="80%" />
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

export function Journal() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const entries = useApiCall<EntryRecord[]>(
    (signal) =>
      apiMethods.listEntries({
        signal,
        ...(filter === "all" ? {} : { type: filter as EntryType }),
      }),
    // Key the hook on filter so it re-fetches when the user changes the filter.
    // useApiCall's deps array isn't currently exposed, so we just call refresh
    // imperatively below.
  );

  function changeFilter(value: FilterValue): void {
    setFilter(value);
    // useApiCall doesn't watch deps; trigger a manual refresh after state lands.
    queueMicrotask(() => void entries.refresh());
  }

  const [editing, setEditing] = useState<EntryRecord | null>(null);
  const [archiving, setArchiving] = useState<EntryRecord | null>(null);
  const [composing, setComposing] = useState(false);

  async function applyArchive(entry: EntryRecord): Promise<void> {
    setArchiving(null);
    try {
      await apiMethods.archiveEntry(entry.id);
      Toast.push({ tone: "success", title: "Archived" });
      await entries.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Archive failed",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function applyEdit(value: string): Promise<void> {
    if (!editing) return;
    const current = editing;
    setEditing(null);
    try {
      await apiMethods.updateEntry(current.id, { title: value });
      Toast.push({ tone: "success", title: "Updated" });
      await entries.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Update failed",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function applyCompose(value: string): Promise<void> {
    setComposing(false);
    try {
      await createEntry({
        title: value.slice(0, 64),
        type: "observation",
        excerpt: value,
        glyph: "feather",
      });
      Toast.push({ tone: "success", title: "Captured" });
      await entries.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Capture failed",
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
          Vault
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
            Journal
          </h1>
          <Button variant="primary" iconStart="feather" onClick={() => setComposing(true)}>
            New entry
          </Button>
        </div>
      </header>

      <SegmentedControl
        options={FILTER_OPTIONS}
        value={filter}
        onChange={changeFilter}
        ariaLabel="Filter by type"
        fullWidth
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        {entries.status === "loading" ? (
          <ListSkeleton />
        ) : entries.status === "error" ? (
          <EmptyState
            glyph="lock"
            title="Couldn't load entries"
            body={entries.error?.message ?? "Unknown error."}
            action={
              <Button variant="secondary" onClick={() => void entries.refresh()}>
                Retry
              </Button>
            }
          />
        ) : entries.data && entries.data.length > 0 ? (
          entries.data.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onEdit={setEditing} onArchive={setArchiving} />
          ))
        ) : (
          <EmptyState
            glyph="journal"
            title={filter === "all" ? "No entries yet" : `No ${filter} entries`}
            body={
              filter === "all"
                ? "Capture your first observation to populate the vault."
                : "Try a different filter, or capture something new."
            }
            action={
              <Button variant="primary" onClick={() => setComposing(true)}>
                Begin
              </Button>
            }
          />
        )}
      </div>

      <PromptDialog
        open={composing}
        title="Quick capture"
        label="Observation"
        placeholder="What did you notice?"
        validate={(v) => (v.trim().length < 3 ? "A few words at least." : null)}
        confirmLabel="Capture"
        onSubmit={(value) => void applyCompose(value)}
        onCancel={() => setComposing(false)}
      />

      <PromptDialog
        open={editing !== null}
        title="Edit title"
        label="Title"
        defaultValue={editing?.title ?? ""}
        validate={(v) => (v.trim().length < 1 ? "Title required." : null)}
        confirmLabel="Save"
        onSubmit={(value) => void applyEdit(value)}
        onCancel={() => setEditing(null)}
      />

      <ConfirmDialog
        open={archiving !== null}
        tone="destructive"
        title="Archive this entry?"
        body={
          archiving
            ? `"${archiving.title}" will be moved to the archive. Restoration ships in Phase 03.`
            : ""
        }
        confirmLabel="Archive"
        onConfirm={() => archiving && void applyArchive(archiving)}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
