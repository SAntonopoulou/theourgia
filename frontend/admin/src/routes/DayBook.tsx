/**
 * The day book — the phone's day journal, on the web.
 *
 * Waking, sleeping, a dream, a dream intended, or a plain note: written here as
 * `day-entry` documents in the record, so they cross to the phone. A waking
 * entry carries the night's sleep quality, as on the phone. Distinct from the
 * vault-timeline `/journal` (which is the backend's separate Entry store); this
 * is the daily reckoning that syncs. Reads back today's entries beneath.
 */

import { JOURNAL_KINDS, Toast } from "@theourgia/shared";
import { useEffect, useState } from "react";

import { writeDayEntry } from "../data/keepObservance.js";
import { apiGet } from "../lib/api.js";

interface DayEntry {
  id: string;
  kind: string;
  body: string;
  at: string;
}

type PullEntry = {
  id?: string;
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null; kind?: unknown; body?: unknown; at?: unknown } | null;
};
type PullResult = { entries: PullEntry[]; next_since: number; more: boolean };

const KIND_LABEL: Record<string, string> = {
  ...Object.fromEntries(JOURNAL_KINDS.map((k) => [k.kind, k.label])),
  sky: "The sky",
};

const SLEEP_LABELS = ["", "Broken", "Restless", "Fair", "Sound", "Deep"];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function DayBook() {
  const [kind, setKind] = useState<string>("note");
  const [body, setBody] = useState("");
  const [sleep, setSleep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<DayEntry[]>([]);

  const active = JOURNAL_KINDS.find((k) => k.kind === kind) ?? JOURNAL_KINDS[0];

  const load = async (): Promise<void> => {
    try {
      const out: DayEntry[] = [];
      let since = 0;
      for (;;) {
        const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
        for (const e of page.entries ?? []) {
          if (e.kind !== "day-entry" || e.deleted_at_utc) continue;
          const doc = e.doc;
          out.push({
            id: str(e.id),
            kind: str(doc?.kind),
            body: str(doc?.body),
            at: str(doc?.at),
          });
        }
        since = page.next_since;
        if (!page.more) break;
      }
      out.sort((a, b) => b.at.localeCompare(a.at));
      setEntries(out.slice(0, 8));
    } catch {
      // Leave the list as it is; writing still works.
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (): Promise<void> => {
    if (body.trim().length === 0) return;
    setSaving(true);
    try {
      await writeDayEntry({
        kind: active?.kind ?? "note",
        body: body.trim(),
        sleepQuality: kind === "waking" ? sleep : null,
      });
      setBody("");
      setSleep(null);
      await load();
      Toast.push({ tone: "success", title: "Written to the record" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="Day book"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: 16,
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 17,
          color: "var(--ink)",
        }}
      >
        Day book
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {JOURNAL_KINDS.map((k) => {
          const on = k.kind === kind;
          return (
            <button
              key={k.kind}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(k.kind)}
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                background: on ? "var(--accent-soft)" : "var(--bg)",
                color: on ? "var(--ink)" : "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={active?.prompt ?? "What happened"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          border: "1px solid var(--line)",
          borderRadius: "var(--r-sm, 6px)",
          background: "var(--bg)",
          color: "var(--ink)",
          resize: "vertical",
          marginBottom: 10,
        }}
      />

      {kind === "waking" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            Sleep
          </span>
          {SLEEP_LABELS.slice(1).map((label, i) => {
            const point = i + 1;
            const on = sleep === point;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => setSleep(on ? null : point)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accent-soft)" : "var(--bg)",
                  color: on ? "var(--ink)" : "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: entries.length ? 16 : 0 }}>
        <button
          type="button"
          disabled={saving || body.trim().length === 0}
          onClick={() => void save()}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--r-md, 8px)",
            border: "1px solid var(--accent)",
            background: saving || body.trim().length === 0 ? "var(--bg)" : "var(--accent)",
            color: saving || body.trim().length === 0 ? "var(--ink-mute)" : "var(--on-accent, #fff)",
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: saving || body.trim().length === 0 ? "default" : "pointer",
          }}
        >
          {saving ? "Writing…" : "Write"}
        </button>
      </div>

      {entries.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {entries.map((e) => (
            <li key={e.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 2,
                }}
              >
                {KIND_LABEL[e.kind] ?? e.kind}
                {e.at ? ` · ${new Date(e.at).toLocaleDateString()}` : ""}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {e.body}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
