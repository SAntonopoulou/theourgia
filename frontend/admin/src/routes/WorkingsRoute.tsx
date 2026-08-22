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
  ConfirmDialog,
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
import { useEffect, useState } from "react";

import {
  amendObservance,
  deleteWorking,
  keepObservance,
  writeWorking,
} from "../data/keepObservance.js";
import {
  type PackedWorking,
  type PackedWorkingItem,
  adoptWorking,
  usePackedWorkings,
} from "../data/packedWorkings.js";
import { useMyLocation } from "../data/useLocation.js";
import { AdoptLibrary, type AdoptOffering } from "../lib/AdoptLibrary.js";
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

  // The library: whole operations on offer from installed packs, browsed and
  // adopted in a dialog. The page itself stays the operations you are running.
  const packedWorkings = usePackedWorkings();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const heldNames = new Set((workings ?? []).map((w) => w.name.trim().toLowerCase()));
  const packedByKey = new Map<string, PackedWorking>();
  const offerings: AdoptOffering[] = (packedWorkings.data ?? []).map((w, i) => {
    const key = `${w.name}-${i}`;
    packedByKey.set(key, w);
    return {
      key,
      name: w.name,
      summary: w.summary,
      badges: [
        ...(w.stages.length > 0
          ? [`${w.stages.length} ${w.stages.length === 1 ? "phase" : "phases"}`]
          : []),
        ...(w.items.length > 0
          ? [`${w.items.length} ${w.items.length === 1 ? "practice" : "practices"} throughout`]
          : []),
      ],
      packTitle: w.packTitle || undefined,
      held: heldNames.has(w.name.trim().toLowerCase()),
      sections: workingSections(w),
    };
  });

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

  // v1-044 — deletion asks in the app's own voice, never a browser alert.
  const [pendingDelete, setPendingDelete] = useState<Working | null>(null);

  const remove = async (w: Working): Promise<void> => {
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
          onDelete={editing.working ? () => setPendingDelete(editing.working) : undefined}
          busy={busy}
        />
      ) : (
        <>
          {/* One composed head: what this page is, and the two ways in —
              begin an operation, or open the library of what packs offer. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.55,
                maxWidth: 480,
              }}
            >
              A working is a rite kept over time — begin one with the items a day asks of it, or
              mark what a running operation asks as you perform it. Phase criteria stay yours to
              declare.
            </p>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md, 10px)",
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                The library{offerings.length > 0 ? ` · ${offerings.length}` : ""}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ working: null })}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md, 10px)",
                  border: "1px solid var(--accent)",
                  background: "var(--accent-soft)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Begin a working
              </button>
            </div>
          </div>

          {error ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
              The record didn’t load: {error}
            </p>
          ) : workings === null ? (
            <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
          ) : (
            <WorkingsLibrary
              workings={workings}
              emptyMessage="No operations yet. Open the library to adopt one whole from your installed packs — phases and all — or begin your own."
              onPerform={(i, w) => void perform(i, w)}
              performedKeys={performedKeys}
              onEdit={(w) => setEditing({ working: w })}
            />
          )}

          <AdoptLibrary
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            title="Workings"
            intro="Whole operations from your installed packs — phases, items, scripts and each phase's say over the daily practices. Adopting copies the operation into one of your own; writing it out and starting it are different acts, and nothing begins until you start it."
            kinds={["working"]}
            offerings={offerings}
            emptyText="None of your installed packs carries workings yet. Install one above and its operations appear here."
            onAdopt={async (o) => {
              const w = packedByKey.get(o.key);
              if (w) {
                await adoptWorking(w);
                await refresh();
              }
            }}
            onInstalled={() => void packedWorkings.refetch()}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="destructive"
        title={`Delete "${pendingDelete?.name || "this working"}"?`}
        body="The whole operation — phases and all — is removed here and on the phone."
        confirmLabel="Delete"
        onConfirm={() => {
          const w = pendingDelete;
          setPendingDelete(null);
          if (w) void remove(w);
        }}
        onCancel={() => setPendingDelete(null)}
      />

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

function cadenceWord(cadence: string, perDay: number): string {
  return cadence === "timesADay" ? `${perDay}\u00d7 a day` : cadence === "once" ? "once" : "daily";
}

function itemLines(items: readonly PackedWorkingItem[]): string {
  return items
    .map(
      (it) =>
        `\u2022 ${it.title} \u2014 ${cadenceWord(it.cadence, it.perDay)}${it.script ? `\n${it.script}` : ""}`,
    )
    .join("\n\n");
}

/** The detail pane of one packed working: the throughout practices, then each
 *  phase with its length, its criterion and its own items \u2014 readable, so the
 *  operation can be weighed whole before it is adopted. */
function workingSections(w: PackedWorking): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = [];
  if (w.items.length > 0) {
    sections.push({ title: "Throughout \u2014 first day to last", body: itemLines(w.items) });
  }
  w.stages.forEach((stage, i) => {
    const lines: string[] = [];
    if (stage.untilSky !== null) {
      lines.push(
        `Kept until the sky reaches it \u2014 ${stage.untilSky.count} ${stage.untilSky.kind}.`,
      );
    } else {
      lines.push(stage.days === 1 ? "One day." : `${stage.days} days.`);
    }
    if (stage.opensAfter !== null) {
      lines.push(`Opens ${stage.opensAfter.count} ${stage.opensAfter.kind} after the one before.`);
    }
    if (stage.criterion) lines.push(stage.criterion);
    if (stage.items.length > 0) lines.push(itemLines(stage.items));
    sections.push({
      title: `${i + 1} \u00b7 ${stage.name}`,
      body: lines.join("\n\n"),
    });
  });
  return sections;
}
