/**
 * The practitioner's saved sittings, read from and written to the record.
 *
 * A meditation plan crosses as a `meditation` subject row whose `plan` is the
 * phone's segment tree (see lib/domain/meditation.dart). The web authors the
 * clean case — a silent sit of N minutes, optionally a bell at the end — as one
 * `stretch` segment holding a `sit` phase, which the phone parses exactly.
 * Breath plans (a nested BreathPractice) stay on the phone; the web breath pacer
 * already does that practice. Pure — the sums and JSON are tested.
 */

/** A saved sitting, ready to list or run. */
export interface MeditationPlanSummary {
  id: string;
  name: string;
  summary: string;
  /** Total length of the sit, in seconds. */
  seconds: number;
  /** Whether a bell sounds at the end. */
  bell: boolean;
  createdAt: string | null;
}

export interface MeditationRecordEntry {
  kind: string;
  deleted_at_utc?: string | null;
  doc?: { row?: Record<string, unknown> | null } | null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** The phone's plan JSON for a silent sit of `minutes`, a bell at the end when
 *  asked — one `stretch` segment holding a `sit` phase. */
export function buildSitPlanJson(minutes: number, bell: boolean): string {
  const seconds = Math.max(1, Math.round(minutes * 60));
  const phase: Record<string, unknown> = { kind: "sit", seconds };
  if (bell) phase.bell = true;
  return JSON.stringify({ segments: [{ segment: "stretch", phase }] });
}

/** Total seconds + whether any phase rings a bell, from a plan JSON — reads
 *  both `stretch` and `cycle` segments so a plan authored on the phone is read
 *  faithfully too. Tolerant of malformed input. */
export function planTotals(planJson: string): { seconds: number; bell: boolean } {
  try {
    const parsed: unknown = JSON.parse(planJson);
    const segments = (parsed as { segments?: unknown }).segments;
    if (!Array.isArray(segments)) return { seconds: 0, bell: false };
    let seconds = 0;
    let bell = false;
    const phaseSeconds = (p: unknown): number => {
      const ph = p as { seconds?: unknown; bell?: unknown };
      if (ph?.bell === true) bell = true;
      return num(ph?.seconds);
    };
    for (const seg of segments) {
      const s = seg as { segment?: unknown; phase?: unknown; repeats?: unknown; steps?: unknown };
      if (s.segment === "cycle" && Array.isArray(s.steps)) {
        const per = s.steps.reduce((sum: number, st) => sum + phaseSeconds(st), 0);
        seconds += per * Math.max(1, num(s.repeats) || 1);
      } else {
        seconds += phaseSeconds(s.phase);
      }
    }
    return { seconds, bell };
  } catch {
    return { seconds: 0, bell: false };
  }
}

/** The saved plans of one kind among a set of record entries, newest first —
 *  `"sitting"` for the Meditation surface, `"breath"` for the pacer. The two
 *  share one store on both platforms (the phone's meditations table); the
 *  kind decides which page shows a plan, never where it lives. */
export function meditationPlansFromEntries(
  entries: readonly MeditationRecordEntry[],
  kind: "sitting" | "breath" = "sitting",
): MeditationPlanSummary[] {
  const byId = new Map<string, MeditationPlanSummary>();
  for (const entry of entries) {
    if (entry.kind !== "meditation" || entry.deleted_at_utc) continue;
    const row = entry.doc?.row;
    if (!row) continue;
    if (str(row.deletedAt).length > 0) {
      byId.delete(str(row.id));
      continue;
    }
    // A row without a kind predates the field and is a sitting.
    if ((str(row.kind) || "sitting") !== kind) continue;
    const id = str(row.id);
    if (id.length === 0) continue;
    const { seconds, bell } = planTotals(str(row.plan));
    byId.set(id, {
      id,
      name: str(row.name),
      summary: str(row.summary),
      seconds,
      bell,
      createdAt: str(row.createdAt) || null,
    });
  }
  return [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
