/**
 * Workings — the long operations the practitioner is running.
 *
 * Web parity with the phone's Workings screen. A working is written and begun on
 * the phone and crosses in the record sync (a `working` document, its phases as
 * `working-stage`, its performable items as `working-item`). This reads them
 * back, lays each operation out with its phases in order, and lets a day's item
 * be marked performed — an observance keyed `working-item:<id>`, which crosses
 * back to the phone.
 */

import {
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  type Working,
  type WorkingItem,
  WorkingsLibrary,
  Toast,
  useTopbar,
  workingsFromEntries,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

type PullResult = {
  entries: {
    kind: string;
    deleted_at_utc?: string | null;
    doc?: { row?: Record<string, unknown> | null; subjectKey?: unknown; occurrenceAt?: unknown } | null;
  }[];
  next_since: number;
  more: boolean;
};

/** Local midnight today, as an ISO instant — the day an item is performed for. */
function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function WorkingsRoute() {
  useTopbar(
    () => ({ title: "Workings", subtitle: "The operations that run over days and months" }),
    [],
  );

  const [workings, setWorkings] = useState<Working[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [performedKeys, setPerformedKeys] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: PullResult["entries"] = [];
        const todayStr = new Date().toDateString();
        const done = new Set<string>();
        let since = 0;
        for (;;) {
          const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
          for (const e of page.entries ?? []) {
            all.push(e);
            // An item performed today, from the same pull.
            if (e.kind !== "observance" || e.deleted_at_utc) continue;
            const key = e.doc?.subjectKey;
            const occ = e.doc?.occurrenceAt;
            if (
              typeof key === "string" &&
              key.startsWith("working-item:") &&
              typeof occ === "string" &&
              new Date(occ).toDateString() === todayStr
            ) {
              done.add(key);
            }
          }
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) {
          setWorkings(workingsFromEntries(all));
          setPerformedKeys(done);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const perform = async (item: WorkingItem, working: Working): Promise<void> => {
    const subjectKey = `working-item:${item.id}`;
    setBusy(true);
    try {
      const entry = await keepObservance({
        subjectKey,
        occurrenceAt: startOfTodayISO(),
        subjectName: working.subjectName,
        location: { lat: loc.lat, lng: loc.lng },
      });
      setPerformedKeys((prev) => new Set(prev).add(subjectKey));
      setSheet({ entry, title: item.title });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't keep",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
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
      // The item is marked; the note simply didn't attach.
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  return (
    <section style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <p
        style={{
          margin: "0 0 20px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        A working is a rite kept over time — its phases open on completion, on a date, after a span,
        or when a sign is received. Mark what the day asks as you perform it; whether a phase’s
        criterion is met stays the practitioner’s to declare on the phone.
      </p>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
          The record didn’t load: {error}
        </p>
      ) : workings === null ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : (
        <WorkingsLibrary
          workings={workings}
          onPerform={(i, w) => void perform(i, w)}
          performedKeys={performedKeys}
        />
      )}

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
