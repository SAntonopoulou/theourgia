/**
 * Editor admin — entry composer (Tiptap-based · live).
 *
 * Two modes:
 *
 *   · `/editor` (no id) — demo mode. Mounts a static seed document
 *     ("Invocation of the Agathos Daimon"). No API calls. Save status
 *     shown as "Demo · not saved".
 *
 *   · `/editor/:id` — live mode. Fetches the entry's detail record
 *     via `getEntryDetail`; mounts `TiptapEditor` with the parsed
 *     body; debounces `updateEntryBody` calls on every editor change
 *     (~1 s). Topbar status indicator reads `Saving…` while the
 *     PATCH is in flight, `Saved · just now` after, or
 *     `Save failed · retry` on error.
 *
 * Pickers (entity / library / chart) and visibility / publish wiring
 * land in B99c.
 */

import {
  TiptapEditor,
  Toast,
  useTopbar,
  type EntryDetailRecord,
} from "@theourgia/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
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
  | { state: "error"; message: string }
  | { state: "demo" };

function VisibilityChip() {
  return (
    <div
      role="status"
      aria-label="Visibility · Sealed"
      style={{
        display: "flex",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
      }}
    >
      <span style={{ padding: "6px 11px", color: "var(--ink-soft)" }}>Personal</span>
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
    </div>
  );
}

const DEMO_DOC = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Invocation of the Agathos Daimon" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text:
            "Began with the banishing by the Lesser Ritual of the Pentagram, then the Bornless preliminary invocation. The temple settled quickly tonight — the candle flames steadied at the third circumambulation.",
        },
      ],
    },
    {
      type: "ritualLog",
      attrs: {
        entries: [
          { time: "14:12", text: "Banishing — LRP, all quarters" },
          { time: "14:18", text: "Bornless preliminary invocation" },
          { time: "14:31", text: "Conjuration — third call, presence felt" },
        ],
      },
    },
    {
      type: "quoteCitation",
      attrs: {
        sourceText: "Ἐγώ εἰμι ὁ Ἀκέφαλος δαίμων…",
        sourceScript: "el",
        translation: "“I am the Headless daemon, seeing with my feet.”",
        citation: "Papyri Graecae Magicae, PGM V. 96–172",
      },
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "At the name of the " },
        {
          type: "text",
          marks: [{ type: "lang", attrs: { script: "el" } }],
          text: "ἀγαθὸς δαίμων",
        },
        {
          type: "text",
          text:
            " the air thickened and a faint citrus scent rose — recorded below in the sensation map. I held the image of the serpent crowned until the vision steadied.",
        },
      ],
    },
    {
      type: "gematria",
      attrs: { word: "ἀγαθοδαίμων", script: "greek", also: "also: ἡ σφραγίς · 989" },
    },
    {
      type: "sensation",
      attrs: {
        points: [
          { y: 8, color: "var(--accent)", label: "Crown · pressure" },
          { y: 38, color: "var(--c-divination)", label: "Throat · cool" },
          { y: 58, color: "var(--c-working)", label: "Solar plexus · heat" },
        ],
      },
    },
  ],
};

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const text =
    status.state === "demo"
      ? "Demo · not saved"
      : status.state === "saving"
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
        : status.state === "demo"
          ? "var(--ink-mute)"
          : status.state === "saved"
            ? "var(--c-synchronicity)"
            : "var(--ink-mute)";
  return (
    <span
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
  const entryId = params.id ?? null;
  const detail = useEntryDetail(entryId);
  const entities = useEntities();
  const books = useBooks();

  const [doc, setDoc] = useState<unknown | null>(null);
  const [status, setStatus] = useState<SaveStatus>(
    entryId === null ? { state: "demo" } : { state: "idle" },
  );
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Hydrate from detail on first successful fetch.
  useEffect(() => {
    if (entryId === null) {
      setDoc(DEMO_DOC);
      return;
    }
    if (detail.status === "ok" && detail.data) {
      const body = detail.data.body;
      try {
        const parsed = body && body.length > 0 ? JSON.parse(body) : null;
        setDoc(parsed ?? { type: "doc", content: [{ type: "paragraph" }] });
      } catch {
        setDoc({ type: "doc", content: [{ type: "paragraph" }] });
      }
      setPublishedAt(detail.data.published_at);
    }
  }, [detail.status, detail.data, entryId]);

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
      before: <VisibilityChip />,
      after: (
        <PublishCta
          entryId={entryId}
          publishedAt={publishedAt}
          onPublished={(next) => setPublishedAt(next.published_at)}
        />
      ),
    }),
    [entryId, detail.data?.title, status, publishedAt],
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
      {doc !== null ? (
        <TiptapEditor
          initialDoc={doc}
          onChange={onChange}
          placeholder="Begin writing…"
          entities={entities.data ?? undefined}
          books={books.data ?? undefined}
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
          padding: 44px 28px 120px;
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
