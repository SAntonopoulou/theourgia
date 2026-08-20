/**
 * The practitioner's workings, read from the synced record.
 *
 * A working is a long operation — an eighteen-month labour, a probationer's
 * cycle — written on the phone and crossed as a `working` document, with its
 * phases as `working-stage` documents. This gathers both from the record store
 * into `Working`s with their stages in order. Pure, so it is tested without a
 * network; read-only, mirroring the phone's Workings screen.
 */

/** A record entry as the pull returns it — only the fields a working needs. */
export interface WorkingRecordEntry {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null } | null;
}

/** One phase of a working. */
export interface WorkingStage {
  id: string;
  name: string;
  orderIndex: number;
  /** What the tradition asks before this phase opens or finishes, in its own
   *  words — carried and shown, never judged. */
  criterion: string;
  /** Whether the practitioner has declared this stage's criterion met. */
  declared: boolean;
}

/** One working — a long operation, with its phases. */
export interface Working {
  id: string;
  name: string;
  summary: string;
  /** Whether it has been begun (writing it out and starting it are different
   *  acts; the day count runs from the second). */
  started: boolean;
  /** ISO instant it began, or null if not yet started. */
  startedAt: string | null;
  /** Whose chart it turns on, copied in so it survives the nativity's deletion.
   *  Empty for an operation that turns on nobody's. */
  subjectName: string;
  stages: WorkingStage[];
  updatedAt: string | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stageFrom(row: Record<string, unknown>): { workingId: string; stage: WorkingStage } | null {
  const id = str(row.id);
  const workingId = str(row.workingId);
  if (id.length === 0 || workingId.length === 0) return null;
  return {
    workingId,
    stage: {
      id,
      name: str(row.name),
      orderIndex: num(row.orderIndex),
      criterion: str(row.criterion),
      declared: str(row.declaredAt).length > 0,
    },
  };
}

/**
 * The workings among a set of record entries, A→Z, each carrying its phases in
 * their declared order. Deleted workings and stages are dropped; a stage whose
 * working is gone is dropped with it.
 */
export function workingsFromEntries(entries: readonly WorkingRecordEntry[]): Working[] {
  const workings = new Map<string, Working>();
  const stagesByWorking = new Map<string, WorkingStage[]>();

  for (const entry of entries) {
    if (entry.deleted_at_utc) continue;
    const row = entry.doc?.row;
    if (!row) continue;
    if (str(row.deletedAt).length > 0) continue;

    if (entry.kind === "working") {
      const id = str(row.id);
      if (id.length === 0) continue;
      workings.set(id, {
        id,
        name: str(row.name),
        summary: str(row.summary),
        started: str(row.startedAt).length > 0,
        startedAt: str(row.startedAt) || null,
        subjectName: str(row.subjectName),
        stages: [],
        updatedAt: str(row.updatedAt) || null,
      });
    } else if (entry.kind === "working-stage") {
      const parsed = stageFrom(row);
      if (!parsed) continue;
      const list = stagesByWorking.get(parsed.workingId) ?? [];
      list.push(parsed.stage);
      stagesByWorking.set(parsed.workingId, list);
    }
  }

  for (const [workingId, stages] of stagesByWorking) {
    const working = workings.get(workingId);
    if (!working) continue; // an orphan stage — its working is gone
    working.stages = stages.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return [...workings.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}
