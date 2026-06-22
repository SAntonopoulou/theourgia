/**
 * Daily Practice — admin route wrapping the shared DailyPracticeTracker.
 *
 * Composes the shared surface against ``GET /api/v1/practices/today``
 * (B87 backend). Defines a practice via ``POST /api/v1/practices``,
 * marks today done/skipped via the dedicated POST endpoints.
 *
 * Optimistic UI: today-status flips locally before the server confirms
 * so the surface stays snappy; the next refresh reconciles streak +
 * history. A failed write rolls back and surfaces a toast.
 */

import {
  type CompletionStatus,
  type DailyPractice,
  DailyPracticeTracker,
  type DefinePracticeDraft,
  type PracticeTodayView,
  type TodayStatus,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

const TODAY_LONG_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function mapStatus(s: PracticeTodayView["status"]): TodayStatus {
  return s;
}

function mapHistory(
  history: PracticeTodayView["history"],
): CompletionStatus[] {
  return history.map((c: PracticeTodayView["history"][number]) => c as CompletionStatus);
}

function toCardModel(view: PracticeTodayView): DailyPractice {
  return {
    id: view.id,
    name: view.name,
    cadenceHuman: view.cadence_human,
    intention: view.intention,
    entity: view.entity
      ? {
          name: view.entity.name,
          glyph: view.entity.glyph ?? "✦",
        }
      : null,
    status: mapStatus(view.status),
    streak: view.streak,
    streakLabel: view.streak_label,
    history: mapHistory(view.history),
  };
}

export function DailyPracticeRoute() {
  useTopbar(
    () => ({
      title: "Daily practice",
      subtitle:
        "The practices you set yourself — kept, or not, and recorded either way",
    }),
    [],
  );

  const todayLong = useMemo(() => TODAY_LONG_FORMAT.format(new Date()), []);

  const { data, status, refresh } = useApiCall((signal) =>
    apiMethods.practicesToday({ signal }),
  );

  // Local optimistic overlay: practice id → today status. Cleared on
  // refresh.
  const [optimistic, setOptimistic] = useState<Record<string, TodayStatus>>({});

  const beings = useMemo(() => {
    const set = new Set<string>();
    for (const p of data?.practices ?? []) {
      if (p.entity?.name) set.add(p.entity.name);
    }
    return Array.from(set).sort();
  }, [data?.practices]);

  const practices: DailyPractice[] = useMemo(() => {
    if (!data) return [];
    return data.practices.map((view) => {
      const card = toCardModel(view);
      const overlaid = optimistic[view.id];
      if (overlaid !== undefined) {
        card.status = overlaid;
        // Reflect today's status in the trailing history cell.
        const next = [...card.history];
        const last = next.length - 1;
        if (last >= 0) {
          next[last] =
            overlaid === "done"
              ? "done"
              : overlaid === "skipped"
                ? "skip"
                : "miss";
        }
        card.history = next;
      }
      return card;
    });
  }, [data, optimistic]);

  const applyOptimistic = useCallback(
    (id: string, status: TodayStatus) =>
      setOptimistic((m) => ({ ...m, [id]: status })),
    [],
  );

  const clearOptimistic = useCallback((id: string) => {
    setOptimistic((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }, []);

  const handleComplete = useCallback(
    async (id: string) => {
      applyOptimistic(id, "done");
      try {
        await apiMethods.completePractice(id);
        clearOptimistic(id);
        await refresh();
      } catch (e) {
        clearOptimistic(id);
        Toast.push({
          tone: "warning",
          title: "Could not record",
          body:
            e instanceof Error ? e.message : "Try again — the record was not saved.",
        });
      }
    },
    [applyOptimistic, clearOptimistic, refresh],
  );

  const handleSkip = useCallback(
    async (id: string) => {
      applyOptimistic(id, "skipped");
      try {
        await apiMethods.skipPractice(id);
        clearOptimistic(id);
        await refresh();
      } catch (e) {
        clearOptimistic(id);
        Toast.push({
          tone: "warning",
          title: "Could not record",
          body:
            e instanceof Error ? e.message : "Try again — the record was not saved.",
        });
      }
    },
    [applyOptimistic, clearOptimistic, refresh],
  );

  const handleReset = useCallback(
    async (id: string) => {
      applyOptimistic(id, "pending");
      try {
        await apiMethods.undoPracticeToday(id);
        clearOptimistic(id);
        await refresh();
      } catch (e) {
        clearOptimistic(id);
        Toast.push({
          tone: "warning",
          title: "Could not undo",
          body:
            e instanceof Error ? e.message : "Try again — the change was not saved.",
        });
      }
    },
    [applyOptimistic, clearOptimistic, refresh],
  );

  const handleDefine = useCallback(
    async (draft: DefinePracticeDraft) => {
      try {
        await apiMethods.createPractice({
          name: draft.name,
          cadence: draft.cadence,
          // The drawer ships the cadence chip key; "custom" needs the
          // freeform label, which the H04 drawer doesn't carry yet —
          // pass the chip label until the drawer grows a custom field.
          cadence_custom:
            draft.cadence === "custom" ? "Custom cadence" : null,
          intention: draft.intention || null,
          linked_entity_id: null, // entity-name → id lookup is a follow-up
        });
        Toast.push({
          tone: "success",
          title: "Practice added",
          body: `“${draft.name}” will show up here from now on.`,
        });
        await refresh();
      } catch (e) {
        Toast.push({
          tone: "warning",
          title: "Could not save practice",
          body:
            e instanceof Error
              ? e.message
              : "Try again — the practice was not saved.",
        });
      }
    },
    [refresh],
  );

  // While the API call is in flight on first mount, render the surface
  // with no practices — the surface's empty state takes over.
  const renderPractices = status === "ok" ? practices : [];

  return (
    <DailyPracticeTracker
      practices={renderPractices}
      todayLong={todayLong}
      beings={beings}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onReset={handleReset}
      onDefine={handleDefine}
      liberReshHref="/"
    />
  );
}
