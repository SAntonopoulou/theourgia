/**
 * Editor admin — entry composer (Tiptap-based · live).
 *
 *   · `/editor` (no id) — POSTs a fresh draft entry and
 *     replace-navigates to /editor/:id. The old demo-mode specimen
 *     ("Invocation of the Agathos Daimon") was scrubbed in b108-2eh.
 *
 *   · `/editor/:id` — fetches the entry's detail record via
 *     `getEntryDetail`; mounts `TiptapEditor` with the parsed body;
 *     debounces `updateEntryBody` calls on every editor change
 *     (~1 s). Topbar status indicator reads `Saving…` while the
 *     PATCH is in flight, `Saved · just now` after, or
 *     `Save failed · retry` on error.
 *
 * Pickers (entity / library / chart) and visibility / publish wiring
 * land in B99c.
 */

import {
  SealEntryDialog,
  AutoStampChip,
  EntryTagsRow,
  TiptapEditor,
  Toast,
  VisibilityControl,
  VisibilityDowngradeDialog,
  formatAstroSnapshot,
  formatCalendarSnapshot,
  useTopbar,
  type ChartFetchFn,
  type EntityVisibility,
  type EntryDetailRecord,
} from "@theourgia/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";
import {
  createEntry,
  publishEntry,
  updateEntryBody,
  useBooks,
  useEntities,
  useEntryDetail,
} from "../data/useEntries.js";

const LINE = "var(--line)";
const AUTOSAVE_DEBOUNCE_MS = 1000;

type SaveStatus =
  | { state: "idle" }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "saved"; at: Date }
  | { state: "error"; message: string };

interface VisibilityChipProps {
  entryId: string | null;
  visibility: EntityVisibility;
  sealed: boolean;
  onChange: (next: { visibility?: EntityVisibility; sealed?: boolean }) => void;
}

function VisibilityChip({ entryId, visibility, sealed, onChange }: VisibilityChipProps) {
  const [open, setOpen] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState<EntityVisibility | null>(null);
  const [sealDialogOpen, setSealDialogOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDemo = entryId === null;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const VIS_LABEL: Record<EntityVisibility, string> = {
    personal: "Personal",
    viewer: "Viewer",
    hub: "Hub",
    public: "Public",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={isDemo ? undefined : () => setOpen((s) => !s)}
        disabled={isDemo}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        aria-label={`Visibility · ${VIS_LABEL[visibility]}${sealed ? " · Sealed" : ""}`}
        style={{
          display: "flex",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          overflow: "hidden",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          background: open ? "var(--bg-3)" : "transparent",
          color: "inherit",
          cursor: isDemo ? "not-allowed" : "pointer",
          padding: 0,
        }}
      >
        <span style={{ padding: "6px 11px", color: "var(--ink-soft)" }}>
          {VIS_LABEL[visibility]}
        </span>
        {sealed && (
          <span
            style={{
              padding: "6px 11px",
              borderLeft: `1px solid ${LINE}`,
              background: "var(--accent-soft)",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Sealed
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Visibility and seal"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 280,
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 12px 28px rgba(0,0,0,.4)",
            padding: 14,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 8,
              }}
            >
              Visibility
            </div>
            <VisibilityControl
              value={visibility}
              onChange={(next) => onChange({ visibility: next })}
              onRequestDowngrade={(target) => setDowngradeTarget(target)}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 8,
              }}
            >
              Body
            </div>
            <button
              type="button"
              onClick={() => {
                if (sealed) {
                  onChange({ sealed: false });
                } else {
                  setSealDialogOpen(true);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                background: sealed ? "var(--accent-soft)" : "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {sealed ? "Sealed — click to unseal" : "Seal this entry"}
            </button>
          </div>
        </div>
      )}
      <VisibilityDowngradeDialog
        open={downgradeTarget !== null}
        target={(downgradeTarget ?? "viewer") as Exclude<EntityVisibility, "personal">}
        onConfirm={() => {
          if (downgradeTarget !== null) onChange({ visibility: downgradeTarget });
          setDowngradeTarget(null);
        }}
        onCancel={() => setDowngradeTarget(null)}
      />
      <SealEntryDialog
        open={sealDialogOpen}
        onConfirm={() => {
          onChange({ sealed: true });
          setSealDialogOpen(false);
        }}
        onCancel={() => setSealDialogOpen(false)}
      />
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const text =
    status.state === "saving"
      ? "Saving…"
      : status.state === "saved"
        ? "Saved · just now"
        : status.state === "error"
          ? `Save failed · ${status.message}`
          : status.state === "dirty"
            ? "Unsaved"
            : "—";
  const color =
    status.state === "error"
      ? "var(--warn)"
      : status.state === "saving"
        ? "var(--ink-mute)"
        : status.state === "saved"
          ? "var(--c-synchronicity)"
          : "var(--ink-mute)";
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Autosave status: ${text}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginLeft: 8,
        fontSize: 11.5,
        color,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", background: color }}
      />
      {text}
    </span>
  );
}

interface PublishCtaProps {
  entryId: string | null;
  publishedAt: string | null;
  onPublished: (next: EntryDetailRecord) => void;
}

function PublishCta({ entryId, publishedAt, onPublished }: PublishCtaProps) {
  const [busy, setBusy] = useState(false);
  const disabled = entryId === null || busy || publishedAt !== null;

  return (
    <button
      type="button"
      onClick={async () => {
        if (entryId === null) return;
        setBusy(true);
        try {
          const next = await publishEntry(entryId);
          onPublished(next);
          Toast.push({ tone: "success", title: "Published", body: "The entry is now visible at its public URL." });
        } catch (cause) {
          Toast.push({
            tone: "error",
            title: "Publish failed",
            body: cause instanceof Error ? cause.message : "Unknown error",
          });
        } finally {
          setBusy(false);
        }
      }}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--r-md)",
        background: disabled ? "var(--bg-3)" : "var(--accent)",
        color: disabled ? "var(--ink-mute)" : "var(--accent-ink)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {publishedAt ? "Published" : "Publish"}
    </button>
  );
}

export function Editor() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const entryId = params.id ?? null;
  const detail = useEntryDetail(entryId);
  const entities = useEntities();
  const books = useBooks();

  // No :id → create a fresh draft and navigate onto it. The old
  // behaviour rendered a fabricated "Invocation of the Agathos
  // Daimon" specimen document that saved nothing.
  useEffect(() => {
    if (entryId !== null) return;
    let cancelled = false;
    createEntry({
      title: "Untitled entry",
      type: "observation",
      excerpt: "",
      glyph: "quill",
    })
      .then((row) => {
        if (cancelled) return;
        navigate(`/editor/${row.id}`, { replace: true });
      })
      .catch((cause) => {
        Toast.push({
          tone: "error",
          title: "Couldn't start a new entry",
          body: cause instanceof Error ? cause.message : String(cause),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [entryId, navigate]);

  const [doc, setDoc] = useState<unknown | null>(null);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<EntityVisibility>("personal");
  const [sealed, setSealed] = useState<boolean>(false);
  // b108-2hw: editable title. Before this, entries were locked to
  // "Untitled entry" from create — no UI to rename. The topbar
  // breadcrumb read title from `detail.data.title` (read-only), and
  // the blog surface then showed every post as "Untitled".
  const [title, setTitle] = useState<string>("");
  // v1-001: flexible tags + tradition tags.
  const [tags, setTags] = useState<string[]>([]);
  const [traditionTags, setTraditionTags] = useState<string[]>([]);

  // Hydrate from detail on first successful fetch.
  useEffect(() => {
    if (entryId === null) return;
    if (detail.status === "ok" && detail.data) {
      const body = detail.data.body;
      try {
        const parsed = body && body.length > 0 ? JSON.parse(body) : null;
        setDoc(parsed ?? { type: "doc", content: [{ type: "paragraph" }] });
      } catch {
        setDoc({ type: "doc", content: [{ type: "paragraph" }] });
      }
      setPublishedAt(detail.data.published_at);
      setVisibility(detail.data.visibility);
      setSealed(detail.data.sealed);
      setTitle(detail.data.title ?? "");
      setTags(detail.data.tags ?? []);
      setTraditionTags(detail.data.tradition_tags ?? []);
    }
  }, [detail.status, detail.data, entryId]);

  // b108-2hw: PATCH the entry title on blur. Blur is chosen over
  // per-keystroke debouncing so the URL doesn't flicker in the
  // topbar breadcrumb while the user is still typing.
  const onTitleBlur = useMemo(
    () => async (nextTitle: string) => {
      const trimmed = nextTitle.trim();
      if (!trimmed || entryId === null) return;
      if (trimmed === (detail.data?.title ?? "")) return;
      try {
        await apiMethods.updateEntry(entryId, { title: trimmed });
      } catch (cause) {
        Toast.push({
          tone: "error",
          title: "Couldn't save title",
          body: cause instanceof Error ? cause.message : String(cause),
        });
      }
    },
    [entryId, detail.data?.title],
  );

  // v1-001: PATCH tag lists on every chip add / remove — same
  // optimistic-then-toast pattern as the visibility chip.
  const onTagsChange = useMemo(
    () =>
      async (field: "tags" | "tradition_tags", next: string[]) => {
        if (entryId === null) return;
        if (field === "tags") setTags(next);
        else setTraditionTags(next);
        try {
          await apiMethods.updateEntry(entryId, { [field]: next });
        } catch (cause) {
          Toast.push({
            tone: "error",
            title: "Couldn't save tags",
            body: cause instanceof Error ? cause.message : String(cause),
          });
        }
      },
    [entryId],
  );

  const fetchChart: ChartFetchFn = useMemo(
    () =>
      async (req) => {
        const response = await apiMethods.getChart({
          when: req.datetime,
          latitude: req.latitude,
          longitude: req.longitude,
          house_system: req.system,
        });
        return {
          placements: response.placements,
          houses: response.houses,
          aspects: response.aspects,
        };
      },
    [],
  );

  const onVisibilityChange = useMemo(
    () => async (patch: { visibility?: EntityVisibility; sealed?: boolean }) => {
      if (entryId === null) return;
      // Optimistic update — local state moves immediately so the chip
      // feels responsive; PATCH catches up in the background.
      if (patch.visibility !== undefined) setVisibility(patch.visibility);
      if (patch.sealed !== undefined) setSealed(patch.sealed);
      try {
        await apiMethods.updateEntry(entryId, patch);
      } catch (cause) {
        Toast.push({
          tone: "error",
          title: "Couldn't update visibility",
          body: cause instanceof Error ? cause.message : "Unknown error",
        });
      }
    },
    [entryId],
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocRef = useRef<unknown>(null);

  const onChange = useMemo(
    () => (next: unknown) => {
      pendingDocRef.current = next;
      if (entryId === null) return; // demo mode — no save.
      setStatus({ state: "dirty" });
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        const payload = JSON.stringify(pendingDocRef.current);
        setStatus({ state: "saving" });
        try {
          await updateEntryBody(entryId, { body: payload });
          setStatus({ state: "saved", at: new Date() });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "unknown";
          setStatus({ state: "error", message });
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [entryId],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    };
  }, []);

  useTopbar(
    () => ({
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-mute)",
          }}
        >
          <span>Journal</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink-soft)" }}>Workings</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink)" }}>
            {entryId === null
              ? "Untitled draft"
              : detail.data?.title ?? "Loading…"}
          </span>
          <SaveStatusIndicator status={status} />
        </div>
      ),
      before: (
        <VisibilityChip
          entryId={entryId}
          visibility={visibility}
          sealed={sealed}
          onChange={onVisibilityChange}
        />
      ),
      after: (
        <PublishCta
          entryId={entryId}
          publishedAt={publishedAt}
          onPublished={(next) => setPublishedAt(next.published_at)}
        />
      ),
    }),
    [entryId, detail.data?.title, status, publishedAt, visibility, sealed, onVisibilityChange],
  );

  if (entryId !== null && detail.status === "loading") {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        Loading entry…
      </div>
    );
  }

  if (entryId !== null && detail.status === "error") {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          fontFamily: "var(--font-ui)",
          color: "var(--warn)",
        }}
      >
        Failed to load entry: {detail.error?.message ?? "unknown error"}.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, margin: "0 -28px" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "44px 28px 0",
          width: "100%",
          boxSizing: "border-box",
        }}
        data-role="entry-title-container"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => void onTitleBlur(e.target.value)}
          placeholder="Title your entry"
          aria-label="Entry title"
          data-role="entry-title-input"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.1,
            color: "var(--ink)",
            padding: 0,
            marginBottom: 16,
          }}
        />
        <div
          data-role="entry-tags-rows"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 16,
          }}
        >
          <EntryTagsRow
            label="Tags"
            values={tags}
            onChange={(next) => void onTagsChange("tags", next)}
          />
          <EntryTagsRow
            label="Tradition tags"
            values={traditionTags}
            onChange={(next) => void onTagsChange("tradition_tags", next)}
            placeholder="Add a tradition"
          />
        </div>
        {(() => {
          const astroLabel = formatAstroSnapshot(
            detail.data?.astro_snapshot,
          );
          const calendarLabel = formatCalendarSnapshot(
            detail.data?.calendar_snapshot,
          );
          if (!astroLabel && !calendarLabel) return null;
          return (
            <div style={{ marginBottom: 20 }} data-role="entry-autostamp">
              <AutoStampChip
                astro={astroLabel ?? undefined}
                calendar={calendarLabel ?? undefined}
              />
            </div>
          );
        })()}
      </div>
      {doc !== null ? (
        <TiptapEditor
          initialDoc={doc}
          onChange={onChange}
          placeholder="Begin writing…"
          entities={entities.data ?? undefined}
          books={books.data ?? undefined}
          fetchChart={fetchChart}
        />
      ) : null}
      <style>{`
        .theourgia-editor {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          min-height: 0;
        }
        .theourgia-editor .ProseMirror {
          padding: 8px 28px 120px;
          outline: none;
          max-width: 720px;
          margin: 0 auto;
        }
        .theourgia-editor .ProseMirror h1 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 40px;
          line-height: 1.1;
          color: var(--ink);
          margin: 0 0 32px;
        }
        .theourgia-editor .ProseMirror p {
          font-family: var(--font-serif);
          font-size: 19px;
          line-height: 1.7;
          color: var(--ink);
          margin: 0 0 22px;
          text-wrap: pretty;
        }
        .theourgia-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--ink-mute);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
