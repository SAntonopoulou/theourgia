/**
 * Workings offered by installed packs — read from the shared `ritual-set`
 * container and copied whole into an owned working on adopt: the operation,
 * its phases, its items with their scripts, and each phase's say over how
 * often the throughout practices run. Mirrors the phone's `adoptWorking`
 * field for field, because the rows written here are applied by the phone's
 * sync with a strict reader — a divergence is not a display bug but a
 * corrupted operation.
 *
 * A `ritual-set` item counts as a working when it carries `stages`, or items
 * with a cadence. Nothing is begun on adopt: writing an operation out and
 * starting it are different acts, and only the practitioner starts one.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchPackFeed, installedPackPayloads } from "@theourgia/shared";

import { apiMethods } from "./api.js";
import { type WorkingItemDraft, type WorkingStageDraft, writeWorking } from "./keepObservance.js";

// ─── the pack's shapes, as the phone parses them ───────────────────

/** {kind, count} — the phone's SkySpan, in the two counted kinds packs use. */
interface PackedSpan {
  kind: string;
  count: number;
  degrees: number;
  station: string;
  offsetDays: number;
}

interface PackedWorkingItem {
  title: string;
  cadence: string;
  perDay: number;
  script: string;
}

interface PackedWorkingStage {
  name: string;
  days: number;
  runs: PackedSpan | null;
  opensAfter: PackedSpan | null;
  untilSky: PackedSpan | null;
  criterion: string;
  countFrom: string;
  opensNoEarlierThanDay: number | null;
  greek: string;
  key: string;
  namesAre: string;
  /** item title → {cadence, perDay?} — how often a throughout item runs
   *  while this phase is open; `none` sets it down entirely. */
  cadences: Record<string, { cadence: string; perDay: number }>;
  items: PackedWorkingItem[];
}

export interface PackedWorking {
  name: string;
  summary: string;
  stages: PackedWorkingStage[];
  /** Items of the whole undertaking — first day to last, whatever the phase. */
  items: PackedWorkingItem[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function spanFrom(v: unknown): PackedSpan | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const kind = str(o.kind);
  if (kind.length === 0) return null;
  return {
    kind,
    count: num(o.count, 1),
    degrees: num(o.degrees, 0),
    station: str(o.station),
    offsetDays: num(o.offsetDays, 0),
  };
}

/** The phone's SkySpan.toJson, byte for byte — its sync reads this back. */
export function spanJson(span: PackedSpan): string {
  const counted = span.kind === "days" || span.kind === "lunations";
  return JSON.stringify({
    kind: span.kind,
    ...(counted ? { count: span.count } : {}),
    ...(span.kind === "toMoonAt" || span.kind === "toSunAt" ? { degrees: span.degrees } : {}),
    ...(span.kind === "toStation" ? { station: span.station } : {}),
    ...(span.offsetDays !== 0 ? { offsetDays: span.offsetDays } : {}),
  });
}

function itemFrom(v: unknown): PackedWorkingItem | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title);
  if (title.length === 0) return null;
  return {
    title,
    cadence: str(o.cadence),
    perDay: Math.max(1, num(o.perDay, 1)),
    script: str(o.script),
  };
}

export function packedWorkingsFromPayload(payload: unknown): PackedWorking[] {
  const items =
    payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];
  const out: PackedWorking[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = str(row.name);
    if (name.length === 0) continue;
    const hasStages = Array.isArray(row.stages);
    const cadencedItems =
      Array.isArray(row.items) &&
      (row.items as unknown[]).some(
        (it) => it !== null && typeof it === "object" && "cadence" in (it as object),
      );
    if (!hasStages && !cadencedItems) continue; // a rite or an adoration set
    out.push({
      name,
      summary: str(row.summary),
      items: Array.isArray(row.items)
        ? (row.items as unknown[]).flatMap((it) => itemFrom(it) ?? [])
        : [],
      stages: (Array.isArray(row.stages) ? (row.stages as unknown[]) : []).flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const so = s as Record<string, unknown>;
        const stageName = str(so.name);
        if (stageName.length === 0) return [];
        const cadences: Record<string, { cadence: string; perDay: number }> = {};
        if (so.cadences && typeof so.cadences === "object") {
          for (const [title, c] of Object.entries(so.cadences as Record<string, unknown>)) {
            if (!c || typeof c !== "object") continue;
            const co = c as Record<string, unknown>;
            cadences[title] = { cadence: str(co.cadence), perDay: Math.max(1, num(co.perDay, 1)) };
          }
        }
        return [
          {
            name: stageName,
            days: num(so.days, 1),
            runs: spanFrom(so.runs),
            opensAfter: spanFrom(so.opensAfter),
            untilSky: spanFrom(so.untilSky),
            criterion: str(so.criterion),
            countFrom: str(so.countFrom) || "previous",
            opensNoEarlierThanDay:
              typeof so.opensNoEarlierThanDay === "number" ? so.opensNoEarlierThanDay : null,
            greek: str(so.greek),
            key: str(so.key),
            namesAre: str(so.namesAre),
            cadences,
            items: Array.isArray(so.items)
              ? (so.items as unknown[]).flatMap((it) => itemFrom(it) ?? [])
              : [],
          },
        ];
      }),
    });
  }
  return out;
}

/** The workings on offer from installed packs, deduped by content. */
export async function fetchPackedWorkings(): Promise<PackedWorking[]> {
  const [feed, installed] = await Promise.all([fetchPackFeed(), apiMethods.bundlesInstalled()]);
  const slugs = installed.bundles.map((b) => b.slug);
  const payloads = await installedPackPayloads(feed, slugs, "ritual-set");
  const all = payloads.flatMap((p) => packedWorkingsFromPayload(p.payload));
  const seen = new Set<string>();
  return all.filter((w) => {
    const key = `${w.name} ${w.stages.length} ${w.items.map((i) => i.title).join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function usePackedWorkings() {
  return useQuery<PackedWorking[], Error>({
    queryKey: ["packed-workings"],
    queryFn: fetchPackedWorkings,
  });
}

/** A cadence a pack named, or daily where it named nothing this build knows
 *  — daily asks the most, so nothing is quietly relaxed (the phone's rule). */
function cadenceKey(key: string): string {
  return key === "once" || key === "daily" || key === "timesADay" ? key : "daily";
}

/** The entries an adopt writes, pure — tested without a network. Mirrors the
 *  phone's `adoptWorking`: throughout items first (their ids mapped by title
 *  so a phase can change their cadence), then each stage with its own items. */
export function adoptWorkingDrafts(
  offered: PackedWorking,
  newId: () => string = () => crypto.randomUUID(),
): {
  items: WorkingItemDraft[];
  stages: WorkingStageDraft[];
} {
  const items: WorkingItemDraft[] = [];
  const throughout = new Map<string, string>();
  let order = 0;
  for (const item of offered.items) {
    const id = newId();
    items.push({
      id,
      title: item.title,
      script: item.script,
      cadence: cadenceKey(item.cadence),
      perDay: item.perDay,
      orderIndex: order,
      stageId: null,
      ritualId: null,
    });
    order += 1;
    if (item.title.length > 0) throughout.set(item.title, id);
  }

  const stages: WorkingStageDraft[] = [];
  for (const [index, stage] of offered.stages.entries()) {
    const stageId = newId();
    // What this phase asks of the throughout practices. A title the working
    // does not carry is dropped rather than guessed at, as on the phone.
    const cadences: Record<string, unknown> = {};
    for (const [title, c] of Object.entries(stage.cadences)) {
      const itemId = throughout.get(title);
      if (itemId === undefined) continue;
      cadences[itemId] =
        c.cadence === "none"
          ? { cadence: "none" }
          : {
              cadence: cadenceKey(c.cadence),
              ...(c.perDay !== 1 ? { perDay: c.perDay } : {}),
            };
    }
    stages.push({
      id: stageId,
      name: stage.name,
      orderIndex: index,
      openRule:
        stage.opensAfter !== null
          ? "afterSpan"
          : stage.criterion.length > 0
            ? "whenDeclared"
            : "onCompletion",
      openSpan: stage.opensAfter !== null ? spanJson(stage.opensAfter) : null,
      // A phase kept until the sky turns has no length of its own.
      requirement: stage.untilSky !== null ? "untilSky" : "forDays",
      requiredDays: stage.days,
      requiredSpan:
        stage.untilSky !== null
          ? spanJson(stage.untilSky)
          : stage.runs !== null
            ? spanJson(stage.runs)
            : null,
      criterion: stage.criterion,
      countFrom: stage.countFrom === "start" ? "start" : "previous",
      opensNoEarlierThanDay: stage.opensNoEarlierThanDay,
      greek: stage.greek,
      phaseKey: stage.key,
      namesAre: stage.namesAre,
      cadences: Object.keys(cadences).length === 0 ? "" : JSON.stringify(cadences),
    });
    for (const item of stage.items) {
      items.push({
        id: newId(),
        title: item.title,
        script: item.script,
        cadence: cadenceKey(item.cadence),
        perDay: item.perDay,
        orderIndex: order,
        stageId,
        ritualId: null,
      });
      order += 1;
    }
  }
  return { items, stages };
}

/** Adopt a packed working — copy the whole operation into one of the
 *  practitioner's own. Nothing is begun. */
export async function adoptWorking(offered: PackedWorking): Promise<void> {
  const { items, stages } = adoptWorkingDrafts(offered);
  await writeWorking({
    name: offered.name,
    summary: offered.summary,
    subjectName: "",
    items,
    stages,
  });
}
