/**
 * Quick capture — minimalist single-textarea entry surface.
 *
 * The PWA `start_url` in ``public/manifest.webmanifest`` points here, so
 * tapping the home-screen icon opens straight into a blank journal
 * field. Designed to be useful in 5 seconds: focus the textarea, write,
 * tap Save. No taxonomies, no scheduling, no acting-as picker — those
 * land in the full Editor once the user has the thing down.
 *
 * Offline-aware. The Save button writes to ``localStorage.theourgia.queue``
 * as a single append-only JSON array of pending captures, then attempts
 * to drain the queue against the backend. If the network call fails (or
 * the worker is offline), the entry stays in the queue and replays the
 * next time the route loads with the network up.
 *
 * Per ``feedback_quality_over_speed.md`` — this is a substrate the user
 * actually carries with them, so the bar is "works on the subway."
 */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@theourgia/shared";

import { apiMethods } from "../data/api.js";

interface PendingCapture {
  id: string;
  body: string;
  capturedAt: string;
}

const QUEUE_KEY = "theourgia.queue";
const MAX_QUEUE = 200;

function readQueue(): PendingCapture[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PendingCapture => {
      const candidate = p as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.body === "string" &&
        typeof candidate.capturedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeQueue(items: PendingCapture[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const trimmed = items.slice(-MAX_QUEUE);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or storage disabled — silent best-effort.
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Best-effort drain of the offline queue. Live: each queued capture
 * becomes an entry via `POST /api/v1/entries`. Failed items stay in
 * the queue for the next drain attempt (network flap, offline).
 */
async function drainQueue(): Promise<{ drained: number; remaining: number }> {
  const queue = readQueue();
  if (!queue.length) return { drained: 0, remaining: 0 };
  const remaining: PendingCapture[] = [];
  let drained = 0;
  for (const item of queue) {
    try {
      await apiMethods.createEntry({
        title: item.body.slice(0, 64) || "Quick capture",
        type: "capture",
        excerpt: item.body,
        glyph: "feather",
      });
      drained += 1;
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { drained, remaining: remaining.length };
}

export function Capture() {
  const { setLocale } = useI18n();
  // Read translations imperatively to keep the surface tight. The
  // labels below are gettext source strings and will resolve to the
  // active locale via `_()`.
  void setLocale; // touch to silence unused-import in lean builds

  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [pending, setPending] = useState<number>(() => readQueue().length);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus the field on mount so the keyboard pops on mobile.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // On every mount, attempt to drain the queue.
  useEffect(() => {
    void drainQueue().then(({ remaining }) => setPending(remaining));
  }, []);

  function save(): void {
    const trimmed = body.trim();
    if (!trimmed) return;
    const entry: PendingCapture = {
      id: newId(),
      body: trimmed,
      capturedAt: new Date().toISOString(),
    };
    const next = [...readQueue(), entry];
    writeQueue(next);
    setPending(next.length);
    setBody("");
    setStatus(navigator.onLine ? "saved" : "offline");
    textareaRef.current?.focus();

    void drainQueue().then(({ remaining }) => {
      setPending(remaining);
      // Auto-clear the inline status after 2 seconds.
      window.setTimeout(() => setStatus("idle"), 2000);
    });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "max(24px, env(safe-area-inset-top)) 22px env(safe-area-inset-bottom)",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-serif)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: "var(--ink-mute)",
            textDecoration: "none",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Vault
        </a>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Quick capture
        </span>
        {pending > 0 ? (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--warning)",
              padding: "3px 8px",
              border: "1px solid var(--line-2)",
              borderRadius: 999,
            }}
            aria-label={`${pending} pending captures`}
          >
            {pending} pending
          </span>
        ) : (
          <span style={{ width: 80 }} aria-hidden="true" />
        )}
      </header>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          margin: "0 0 6px",
          letterSpacing: "-0.01em",
        }}
      >
        Write it down.
      </h1>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-soft)",
          margin: "0 0 22px",
        }}
      >
        The page asks little. A sentence is enough — you can shape it later.
      </p>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        placeholder="What happened? What did you notice?"
        aria-label="Quick capture body"
        style={{
          flex: 1,
          minHeight: 220,
          width: "100%",
          padding: "16px 18px",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          lineHeight: 1.55,
          color: "var(--ink)",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-lg, 14px)",
          outline: "none",
          resize: "none",
          marginBottom: 16,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          paddingBottom: 4,
        }}
      >
        <div
          aria-live="polite"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color:
              status === "saved" ? "var(--success)" :
              status === "offline" ? "var(--warning)" :
              "var(--ink-mute)",
            minHeight: 18,
          }}
        >
          {status === "saving" ? "Saving…" : null}
          {status === "saved" ? "Saved — queued to vault." : null}
          {status === "offline" ? "Saved locally. Will sync when you're back online." : null}
          {status === "idle" ? "⌘↵ to save" : null}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!body.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "12px 22px",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: body.trim() ? "pointer" : "not-allowed",
            opacity: body.trim() ? 1 : 0.5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
          </svg>
          Save
        </button>
      </div>
    </main>
  );
}
