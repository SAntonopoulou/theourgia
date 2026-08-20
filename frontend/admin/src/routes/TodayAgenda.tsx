/**
 * Today's agenda — what the day asks, beyond the adorations.
 *
 * The phone's Today lays out the day's scheduled rites and sittings and the
 * working items due, each with one tap to keep. This reads the synced record and
 * does the same: schedules whose recurrence falls on today, and every working's
 * performable items, each markable — writing an observance (schedule:<id> or
 * working-item:<id>) that crosses back to the phone. Empty (and silent) until
 * something is scheduled or a working is running.
 */

import {
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  scheduleDueOn,
  scheduleSubjectKey,
  schedulesFromEntries,
  workingsFromEntries,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

interface AgendaRow {
  subjectKey: string;
  title: string;
  detail: string;
}

type PullEntry = {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null; subjectKey?: unknown; occurrenceAt?: unknown } | null;
};
type PullResult = { entries: PullEntry[]; next_since: number; more: boolean };

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const CADENCE_LABEL: Record<string, string> = {
  ritual: "Rite",
  meditation: "Sitting",
  breath: "Breath",
  undertaking: "Working",
};

export function TodayAgenda() {
  const [rows, setRows] = useState<AgendaRow[] | null>(null);
  const [performedKeys, setPerformedKeys] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: PullEntry[] = [];
        const todayStr = new Date().toDateString();
        const done = new Set<string>();
        let since = 0;
        for (;;) {
          const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
          for (const e of page.entries ?? []) {
            all.push(e);
            if (e.kind !== "observance" || e.deleted_at_utc) continue;
            const key = e.doc?.subjectKey;
            const occ = e.doc?.occurrenceAt;
            if (
              typeof key === "string" &&
              (key.startsWith("working-item:") || key.startsWith("schedule:")) &&
              typeof occ === "string" &&
              new Date(occ).toDateString() === todayStr
            ) {
              done.add(key);
            }
          }
          since = page.next_since;
          if (!page.more) break;
        }
        if (cancelled) return;

        const today = new Date();
        const agenda: AgendaRow[] = [];
        for (const s of schedulesFromEntries(all)) {
          if (!scheduleDueOn(s, today)) continue;
          agenda.push({
            subjectKey: scheduleSubjectKey(s),
            title: s.title || CADENCE_LABEL[s.subjectKind] || "Scheduled",
            detail: CADENCE_LABEL[s.subjectKind] ?? s.subjectKind,
          });
        }
        for (const w of workingsFromEntries(all)) {
          for (const item of w.items) {
            agenda.push({
              subjectKey: `working-item:${item.id}`,
              title: item.title,
              detail: w.name || "Working",
            });
          }
        }
        setRows(agenda);
        setPerformedKeys(done);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mark = async (row: AgendaRow): Promise<void> => {
    setBusy(true);
    try {
      const entry = await keepObservance({
        subjectKey: row.subjectKey,
        occurrenceAt: startOfTodayISO(),
        location: { lat: loc.lat, lng: loc.lng },
      });
      setPerformedKeys((prev) => new Set(prev).add(row.subjectKey));
      setSheet({ entry, title: row.title });
    } catch {
      // Leave it unmarked; the practitioner can try again.
    } finally {
      setBusy(false);
    }
  };

  const keepDetails = async (values: KeepingValues): Promise<void> => {
    if (!sheet) return;
    setBusy(true);
    try {
      await amendObservance(sheet.entry, values);
    } catch {
      // The mark stands; the note simply didn't attach.
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  // Silent until there is something to ask — no empty card on Today.
  if (rows === null || rows.length === 0) return null;

  return (
    <section
      aria-label="Today's agenda"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: 16,
        marginBottom: 20,
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
        What today asks
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {rows.map((row) => {
          const done = performedKeys.has(row.subjectKey);
          return (
            <li
              key={row.subjectKey}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {row.title}
                </span>
                <span
                  style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}
                >
                  {row.detail}
                </span>
              </span>
              {done ? (
                <span
                  style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent)" }}
                >
                  Done ✓
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void mark(row)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--r-sm, 6px)",
                    border: "1px solid var(--accent)",
                    background: "var(--accent-soft)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    cursor: busy ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Keep
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {sheet ? (
        <KeepingSheet
          title={sheet.title}
          subtitle="Kept. Add how it was, if you like."
          onKeep={(v) => void keepDetails(v)}
          onClose={() => setSheet(null)}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
