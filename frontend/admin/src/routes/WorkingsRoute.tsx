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
  Toast,
  type Working,
  type WorkingDraft,
  WorkingEditor,
  type WorkingItem,
  WorkingsLibrary,
  useTopbar,
  workingsFromEntries,
} from "@theourgia/shared";
import { useEffect, useRef, useState } from "react";

import {
  amendObservance,
  deleteWorking,
  keepObservance,
  writeWorking,
} from "../data/keepObservance.js";
import { type PackedWorking, adoptWorking, usePackedWorkings } from "../data/packedWorkings.js";
import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

type PullResult = {
  entries: {
    kind: string;
    deleted_at_utc?: string | null;
    doc?: {
      row?: Record<string, unknown> | null;
      subjectKey?: unknown;
      occurrenceAt?: unknown;
    } | null;
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

/** Pull the record whole: the workings, and the items performed today. */
async function pullWorkings(): Promise<{ workings: Working[]; performed: Set<string> }> {
  const all: PullResult["entries"] = [];
  const todayStr = new Date().toDateString();
  const performed = new Set<string>();
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
        key.startsWith("working-item:") &&
        typeof occ === "string" &&
        new Date(occ).toDateString() === todayStr
      ) {
        performed.add(key);
      }
    }
    since = page.next_since;
    if (!page.more) break;
  }
  return { workings: workingsFromEntries(all), performed };
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
  const [editing, setEditing] = useState<{ working: Working | null } | null>(null);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const refresh = async (): Promise<void> => {
    try {
      const { workings, performed } = await pullWorkings();
      setWorkings(workings);
      setPerformedKeys(performed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { workings, performed } = await pullWorkings();
        if (!cancelled) {
          setWorkings(workings);
          setPerformedKeys(performed);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Workings offered by installed packs, adopted whole — phases, items,
  // scripts and per-phase cadences. Nothing is begun on adopt.
  const packedWorkings = usePackedWorkings();
  const adoptInFlight = useRef(false);
  const [adoptBusy, setAdoptBusy] = useState(false);
  const adoptPackedWorking = async (w: PackedWorking): Promise<void> => {
    if (adoptInFlight.current) return;
    adoptInFlight.current = true;
    setAdoptBusy(true);
    try {
      await adoptWorking(w);
      await refresh();
      Toast.push({ tone: "success", title: `Adopted "${w.name}"` });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't adopt",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      adoptInFlight.current = false;
      setAdoptBusy(false);
    }
  };

  const save = async (draft: WorkingDraft, removed: WorkingDraft["items"]): Promise<void> => {
    const existing = editing?.working;
    setBusy(true);
    try {
      await writeWorking({
        id: existing?.id,
        createdAt: existing?.createdAt,
        name: draft.name,
        summary: draft.summary,
        subjectName: draft.subjectName,
        // stageId/script/ritualId ride through untouched — the phone (or a
        // pack) authored them, and this editor edits only what it shows.
        items: draft.items.map((it, i) => ({
          id: it.id,
          createdAt: it.createdAt,
          title: it.title,
          cadence: it.cadence,
          perDay: it.perDay,
          orderIndex: i,
          stageId: it.stageId ?? null,
          script: it.script ?? "",
          ritualId: it.ritualId ?? null,
        })),
        removedItems: removed.map((it, i) => ({
          id: it.id,
          createdAt: it.createdAt,
          title: it.title,
          cadence: it.cadence,
          perDay: it.perDay,
          orderIndex: i,
          stageId: it.stageId ?? null,
          script: it.script ?? "",
          ritualId: it.ritualId ?? null,
        })),
      });
      await refresh();
      setEditing(null);
      Toast.push({ tone: "success", title: existing ? "Working saved" : "Working begun" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (w: Working): Promise<void> => {
    if (!window.confirm(`Delete "${w.name || "this working"}"? It is removed on the phone too.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteWorking({
        id: w.id,
        name: w.name,
        summary: w.summary,
        subjectName: w.subjectName,
        createdAt: w.createdAt,
      });
      await refresh();
      setEditing(null);
      Toast.push({ tone: "info", title: "Working deleted" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't delete",
        body: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

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
      {editing ? (
        <WorkingEditor
          initial={
            editing.working
              ? {
                  name: editing.working.name,
                  summary: editing.working.summary,
                  subjectName: editing.working.subjectName,
                  items: editing.working.items.map((i) => ({
                    id: i.id,
                    createdAt: i.createdAt,
                    title: i.title,
                    cadence: i.cadence,
                    perDay: i.perDay,
                    stageId: i.stageId,
                    script: i.script,
                    ritualId: i.ritualId,
                  })),
                }
              : undefined
          }
          onSave={(d, r) => void save(d, r)}
          onCancel={() => setEditing(null)}
          onDelete={editing.working ? () => void remove(editing.working as Working) : undefined}
          busy={busy}
        />
      ) : (
        <>
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
            A working is a rite kept over time — begin one here with the items a day asks of it, or
            mark what a synced working asks as you perform it. Phase criteria stay the
            practitioner’s to declare on the phone.
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
              onNew={() => setEditing({ working: null })}
              onEdit={(w) => setEditing({ working: w })}
            />
          )}

          {/* Operations on offer from installed packs — adopted whole:
              phases, items, scripts, per-phase cadences. Nothing begins
              until the practitioner starts it. */}
          {(packedWorkings.data ?? []).length > 0 ? (
            <div
              style={{
                marginTop: 26,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                padding: 16,
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 10,
                }}
              >
                From installed packs
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(packedWorkings.data ?? []).map((w, i) => (
                  <div
                    key={`${w.name}-${i}`}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: "var(--font-ui)",
                        fontSize: 14,
                        color: "var(--ink)",
                      }}
                    >
                      {w.name}
                      <span style={{ color: "var(--ink-mute)", fontSize: 12.5 }}>
                        {" "}
                        ·{" "}
                        {w.stages.length > 0
                          ? `${w.stages.length} ${w.stages.length === 1 ? "phase" : "phases"}`
                          : `${w.items.length} ${w.items.length === 1 ? "item" : "items"}`}
                      </span>
                      {w.summary.length > 0 ? (
                        <span
                          style={{
                            display: "block",
                            color: "var(--ink-mute)",
                            fontSize: 12.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {w.summary}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={adoptBusy}
                      onClick={() => void adoptPackedWorking(w)}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "5px 12px",
                        background: "transparent",
                        color: "var(--ink-soft)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        cursor: adoptBusy ? "default" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Adopt
                    </button>
                  </div>
                ))}
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  lineHeight: 1.5,
                }}
              >
                Adopting copies the whole operation — phases and all — into one of your own. Writing
                it out and starting it are different acts; nothing begins until you start it.
              </p>
            </div>
          ) : null}
        </>
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
