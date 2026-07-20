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
 *
 * Sealing (v1-033, Mode B): "Seal this entry" → type-to-confirm
 * (SealEntryDialog) → passphrase prompt (SealUnlock) → the doc is
 * encrypted on this device (`sealToEnvelope`) and POSTed to
 * `/entries/{id}/seal`; the server stores ciphertext, NULLs the
 * plaintext, and purges plaintext revisions. The seal is one-way
 * server-side — there is no unseal. Reading a sealed entry is a
 * different flow: "Sealed — tap to read" / "Unlock to view" fetches
 * the ciphertext and decrypts in memory (read-only preview).
 */

import {
  AutoStampChip,
  type ChartFetchFn,
  ConfirmDialog,
  type EntityVisibility,
  type EntryDetailRecord,
  type EntryRevisionListItem,
  type EntryRevisionRead,
  EntryTagsRow,
  SealEntryDialog,
  SealUnlock,
  SealedContentsBlock,
  TiptapEditor,
  Toast,
  type TranscribeAudioFn,
  VisibilityControl,
  VisibilityDowngradeDialog,
  decryptSealedPayloadB64,
  formatAstroSnapshot,
  formatCalendarSnapshot,
  sealToEnvelope,
  useTopbar,
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
  entryTitle: string;
  visibility: EntityVisibility;
  sealed: boolean;
  publishOnDeath: boolean;
  onChange: (next: {
    visibility?: EntityVisibility;
    publish_on_death?: boolean;
  }) => void;
  /** Confirmed seal request (SealEntryDialog passed) — the Editor
   *  owns the passphrase prompt + client-side encrypt + POST. */
  onRequestSeal: () => void;
  /** Sealed read request — the Editor owns the passphrase prompt +
   *  ciphertext fetch + client-side decrypt. There is NO unseal:
   *  the seal is one-way server-side. */
  onRequestRead: () => void;
}

function VisibilityChip({
  entryId,
  entryTitle,
  visibility,
  sealed,
  publishOnDeath,
  onChange,
  onRequestSeal,
  onRequestRead,
}: VisibilityChipProps) {
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
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
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
                  // Honest affordance: the seal cannot be undone
                  // server-side. Reading is a client-side decrypt
                  // with the passphrase — a different flow.
                  setOpen(false);
                  onRequestRead();
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
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {sealed ? "Sealed — tap to read" : "Seal this entry"}
            </button>
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
              Memorial
            </div>
            <button
              type="button"
              onClick={() => onChange({ publish_on_death: !publishOnDeath })}
              data-role="publish-on-death-toggle"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                background: publishOnDeath ? "var(--accent-soft)" : "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {publishOnDeath
                ? "Publishes after memorial trigger — click to disable"
                : "Publish after memorial trigger"}
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
        entryTitle={entryTitle || "Untitled entry"}
        onConfirm={() => {
          setSealDialogOpen(false);
          setOpen(false);
          onRequestSeal();
        }}
        onCancel={() => setSealDialogOpen(false)}
      />
    </div>
  );
}

// Compact relative-time label — same local-helper precedent as
// Journal.tsx's relativeTime.
function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const min = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Plaintext paragraphs from a Tiptap-JSON body, for the read-only
// revision preview (no second Tiptap mount needed).
function tiptapParagraphs(body: string | null): string[] {
  if (!body) return [];
  try {
    const doc = JSON.parse(body) as { content?: unknown[] };
    const collect = (node: unknown): string => {
      if (Array.isArray(node)) return node.map(collect).join("");
      if (node && typeof node === "object") {
        const n = node as { text?: unknown; content?: unknown };
        if (typeof n.text === "string") return n.text;
        return collect(n.content);
      }
      return "";
    };
    return (doc.content ?? [])
      .map((block) => collect(block).trim())
      .filter((text) => text.length > 0);
  } catch {
    return body.trim().length > 0 ? [body] : [];
  }
}

interface RevisionHistoryProps {
  entryId: string | null;
  sealed: boolean;
  onRestored: (next: EntryDetailRecord) => void;
}

/**
 * Version history (v1-028) — "History" affordance near the title /
 * autostamp area. Popover panel per the VisibilityChip dev-built
 * precedent: revision list (relative time + excerpt), click to
 * preview read-only, Restore behind the house ConfirmDialog.
 */
function RevisionHistory({ entryId, sealed, onRestored }: RevisionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<EntryRevisionListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EntryRevisionRead | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open || sealed || entryId === null) return;
    let cancelled = false;
    setLoadError(null);
    apiMethods
      .listEntryRevisions(entryId)
      .then((rows) => {
        if (!cancelled) setRevisions(rows);
      })
      .catch((cause) => {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : "Unknown error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, sealed, entryId]);

  const onPickRevision = async (rev: EntryRevisionListItem) => {
    if (entryId === null) return;
    try {
      setPreview(await apiMethods.getEntryRevision(entryId, rev.id));
    } catch (cause) {
      Toast.push({
        tone: "error",
        title: "Couldn't load that version",
        body: cause instanceof Error ? cause.message : "Unknown error",
      });
    }
  };

  const doRestore = async () => {
    if (entryId === null || preview === null || busy) return;
    setBusy(true);
    try {
      const next = await apiMethods.restoreEntryRevision(entryId, preview.id);
      onRestored(next);
      Toast.push({
        tone: "success",
        title: "Version restored",
        body: "Your latest text was saved as a new revision first — nothing is lost.",
      });
      setConfirmOpen(false);
      setPreview(null);
      setRevisions(await apiMethods.listEntryRevisions(entryId));
    } catch (cause) {
      setConfirmOpen(false);
      Toast.push({
        tone: "error",
        title: "Couldn't restore",
        body: cause instanceof Error ? cause.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={entryId === null ? undefined : () => setOpen((s) => !s)}
        disabled={entryId === null}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        data-role="entry-history-toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 11px",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          background: open ? "var(--bg-3)" : "transparent",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          cursor: entryId === null ? "not-allowed" : "pointer",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        History
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Version history"
          data-role="entry-history-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 360,
            maxHeight: 420,
            overflowY: "auto",
            overflowX: "hidden",
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 12px 28px rgba(0,0,0,.4)",
            padding: 14,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Version history
          </div>
          {sealed ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ink-soft)",
              }}
            >
              Sealed entries keep no server-readable history — plaintext snapshots would defeat the
              seal.
            </p>
          ) : loadError !== null ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--warn)",
              }}
            >
              Couldn't load history: {loadError}
            </p>
          ) : revisions === null ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              Loading history…
            </p>
          ) : revisions.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ink-mute)",
              }}
            >
              No earlier versions yet. Snapshots are written as you edit — at most one every ten
              minutes.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {revisions.map((rev) => (
                <li key={rev.id}>
                  <button
                    type="button"
                    onClick={() => void onPickRevision(rev)}
                    aria-pressed={preview?.id === rev.id}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-sm)",
                      background: preview?.id === rev.id ? "var(--accent-soft)" : "transparent",
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rev.title}
                      </span>
                      <span style={{ color: "var(--ink-mute)", flexShrink: 0 }}>
                        {relativeTime(rev.created_at)}
                      </span>
                    </span>
                    {rev.body_excerpt.length > 0 && (
                      <span
                        style={{
                          marginTop: 3,
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          lineHeight: 1.45,
                          color: "var(--ink-soft)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {rev.body_excerpt}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {preview !== null && (
            <div
              data-role="entry-history-preview"
              style={{
                borderTop: `1px solid ${LINE}`,
                paddingTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  Preview · revision {preview.revision_number} · {relativeTime(preview.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                  style={{
                    padding: "5px 12px",
                    border: "none",
                    borderRadius: "var(--r-sm)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Restore
                </button>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--ink)",
                }}
              >
                {preview.title}
              </div>
              <div style={{ maxHeight: 140, overflowY: "auto", overflowX: "hidden" }}>
                {tiptapParagraphs(preview.body).map((text, i) => (
                  <p
                    key={`${preview.id}-${i}`}
                    style={{
                      margin: "0 0 8px",
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        tone="constructive"
        title="Restore this version?"
        body="Your current version is saved as a new revision first — nothing is lost."
        confirmLabel="Restore"
        onConfirm={() => void doRestore()}
        onCancel={() => setConfirmOpen(false)}
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
  /** Sealed entries can never publish (defence in depth — the
   *  backend refuses too); the CTA disables rather than 403ing. */
  sealed: boolean;
  onPublished: (next: EntryDetailRecord) => void;
}

function PublishCta({ entryId, publishedAt, sealed, onPublished }: PublishCtaProps) {
  const [busy, setBusy] = useState(false);
  const disabled = entryId === null || busy || publishedAt !== null || sealed;

  return (
    <button
      type="button"
      onClick={async () => {
        if (entryId === null) return;
        setBusy(true);
        try {
          const next = await publishEntry(entryId);
          onPublished(next);
          Toast.push({
            tone: "success",
            title: "Published",
            body: "The entry is now visible at its public URL.",
          });
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
  // v1-028 — bumped on restore so TiptapEditor remounts with the
  // restored doc (initialDoc is only read on mount).
  const [docEpoch, setDocEpoch] = useState(0);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<EntityVisibility>("personal");
  const [sealed, setSealed] = useState<boolean>(false);
  // v1-033 — the Mode B seal + read flows. Sealing prompts for a
  // passphrase, encrypts the doc on this device, and POSTs the
  // envelope; reading fetches the ciphertext and decrypts in memory.
  const [sealPromptOpen, setSealPromptOpen] = useState(false);
  const [revealPromptOpen, setRevealPromptOpen] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealedDoc, setRevealedDoc] = useState<unknown | null>(null);
  // v1-018 — posthumous publication flag.
  const [publishOnDeath, setPublishOnDeath] = useState<boolean>(false);
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
      setPublishOnDeath(detail.data.publish_on_death ?? false);
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
    () => async (field: "tags" | "tradition_tags", next: string[]) => {
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
    () => async (req) => {
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

  // v1-012: queue local Whisper transcription from the voiceRecording
  // node. The node handles the 403 gates (instance off / not opted
  // in) itself via the response detail.
  const transcribeAudio: TranscribeAudioFn = useMemo(
    () => (attachmentId, opts) => apiMethods.transcribeAudio(attachmentId, opts),
    [],
  );

  const onVisibilityChange = useMemo(
    () =>
      async (patch: {
        visibility?: EntityVisibility;
        publish_on_death?: boolean;
      }) => {
        if (entryId === null) return;
        // Optimistic update — local state moves immediately so the chip
        // feels responsive; PATCH catches up in the background.
        // NOTE (v1-033): `sealed` is deliberately NOT in this patch —
        // the PATCH schema rejects it (extra=forbid); sealing routes
        // through the dedicated seal endpoint below.
        if (patch.visibility !== undefined) setVisibility(patch.visibility);
        if (patch.publish_on_death !== undefined) {
          setPublishOnDeath(patch.publish_on_death);
        }
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

  // v1-028 — after a restore the server state is authoritative:
  // rehydrate title + doc and remount the Tiptap surface.
  const onRestored = useMemo(
    () => (next: EntryDetailRecord) => {
      setTitle(next.title);
      try {
        const parsed = next.body && next.body.length > 0 ? JSON.parse(next.body) : null;
        setDoc(parsed ?? { type: "doc", content: [{ type: "paragraph" }] });
      } catch {
        setDoc({ type: "doc", content: [{ type: "paragraph" }] });
      }
      setDocEpoch((epoch) => epoch + 1);
    },
    [],
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocRef = useRef<unknown>(null);

  // v1-033 — seal: encrypt the current doc on this device, POST the
  // envelope; the server NULLs the plaintext and purges revisions.
  const handleSeal = useMemo(
    () => async (passphrase: string) => {
      if (entryId === null) return;
      try {
        // A pending auto-save would 403 against a sealed row — the
        // doc being sealed IS the latest doc, so drop it.
        if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
        const docToSeal = pendingDocRef.current ?? doc;
        const envelope = await sealToEnvelope(docToSeal, passphrase);
        await apiMethods.sealEntry(entryId, { encrypted_payload: envelope });
        setSealed(true);
        setStatus({ state: "idle" });
        setSealPromptOpen(false);
        Toast.push({
          tone: "success",
          title: "Entry sealed",
          body: "Encrypted on this device; the server can't read it.",
        });
      } catch (cause) {
        setSealPromptOpen(false);
        Toast.push({
          tone: "error",
          title: "Couldn't seal the entry",
          body: cause instanceof Error ? cause.message : "Unknown error",
        });
      }
    },
    [entryId, doc],
  );

  // v1-033 — read a sealed entry: fetch the ciphertext, decrypt in
  // memory with the passphrase. Read-only; the row stays sealed.
  const handleReveal = useMemo(
    () => async (passphrase: string) => {
      if (entryId === null) return;
      try {
        const payload = await apiMethods.getEntrySealedPayload(entryId);
        const revealed = await decryptSealedPayloadB64<unknown>(
          payload.encrypted_payload_b64,
          passphrase,
        );
        setRevealedDoc(revealed);
        setRevealError(null);
        setRevealPromptOpen(false);
      } catch {
        setRevealError("Passphrase didn't decrypt — try again.");
      }
    },
    [entryId],
  );

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
            {entryId === null ? "Untitled draft" : (detail.data?.title ?? "Loading…")}
          </span>
          <SaveStatusIndicator status={status} />
        </div>
      ),
      before: (
        <VisibilityChip
          entryId={entryId}
          entryTitle={title}
          visibility={visibility}
          sealed={sealed}
          publishOnDeath={publishOnDeath}
          onChange={onVisibilityChange}
          onRequestSeal={() => setSealPromptOpen(true)}
          onRequestRead={() => setRevealPromptOpen(true)}
        />
      ),
      after: (
        <PublishCta
          entryId={entryId}
          publishedAt={publishedAt}
          sealed={sealed}
          onPublished={(next) => setPublishedAt(next.published_at)}
        />
      ),
    }),
    [
      entryId,
      detail.data?.title,
      title,
      status,
      publishedAt,
      visibility,
      sealed,
      publishOnDeath,
      onVisibilityChange,
    ],
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
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, margin: "0 -28px" }}
    >
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
          const astroLabel = formatAstroSnapshot(detail.data?.astro_snapshot);
          const calendarLabel = formatCalendarSnapshot(detail.data?.calendar_snapshot);
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
        <div style={{ marginBottom: 20 }} data-role="entry-history">
          <RevisionHistory entryId={entryId} sealed={sealed} onRestored={onRestored} />
        </div>
      </div>
      {sealed ? (
        <div
          data-role="entry-sealed-body"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 28px 120px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {revealedDoc === null ? (
            <SealedContentsBlock
              body="The server cannot read it, cannot search it, and cannot recover it if your key is ever lost."
              footer="Only on a device with your passphrase"
              onUnlock={() => setRevealPromptOpen(true)}
            />
          ) : (
            <div data-role="entry-sealed-preview">
              {tiptapParagraphs(JSON.stringify(revealedDoc)).map((text, i) => (
                <p
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional read-only paragraphs
                  key={`sealed-paragraph-${i}`}
                  style={{
                    margin: "0 0 22px",
                    fontFamily: "var(--font-serif)",
                    fontSize: 19,
                    lineHeight: 1.7,
                    color: "var(--ink)",
                  }}
                >
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : doc !== null ? (
        <TiptapEditor
          key={`doc-${docEpoch}`}
          initialDoc={doc}
          onChange={onChange}
          placeholder="Begin writing…"
          entities={entities.data ?? undefined}
          books={books.data ?? undefined}
          fetchChart={fetchChart}
          transcribeAudio={transcribeAudio}
        />
      ) : null}
      {/* v1-033 — passphrase prompt for the client-side seal. */}
      <SealUnlock
        open={sealPromptOpen}
        policy="per-read"
        title="Seal these contents"
        body="Your passphrase encrypts this entry on this device before it is saved. It is never sent to the server."
        onUnlock={(passphrase) => void handleSeal(passphrase)}
        onCancel={() => setSealPromptOpen(false)}
      />
      {/* v1-033 — passphrase prompt for the in-memory read. */}
      <SealUnlock
        open={revealPromptOpen}
        policy="per-read"
        body="Your passphrase decrypts this sealed entry on this device for this single read. It is never sent to the server."
        errorMessage={revealError ?? undefined}
        onUnlock={(passphrase) => void handleReveal(passphrase)}
        onCancel={() => {
          setRevealPromptOpen(false);
          setRevealError(null);
        }}
      />
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
