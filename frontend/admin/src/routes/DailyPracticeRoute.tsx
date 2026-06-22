/**
 * Daily Practice — admin route wrapping the shared DailyPracticeTracker.
 *
 * Holds the in-memory practice list + today statuses while the backend
 * `/api/v1/practices` endpoints are wired. The shared surface is
 * presentation-only; this route persists user actions and (eventually)
 * round-trips through the API.
 */

import {
  type CompletionStatus,
  type DailyPractice,
  DailyPracticeTracker,
  type DefinePracticeDraft,
  type TodayStatus,
  Toast,
  countKept as _countKept,
  streak as streakOf,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

// Deterministic 35-day history matching the mockup's hist(seed, density)
// generator. Provides realistic fixture data until the backend wires up.
function mockHistory(seed: number, density: number): CompletionStatus[] {
  const out: CompletionStatus[] = [];
  for (let d = 0; d < 35; d++) {
    const r = ((d * 13 + seed * 7 + 3) % 17) / 17;
    if (r < density) out.push("done");
    else if (r < density + 0.12) out.push("skip");
    else out.push("miss");
  }
  return out;
}

interface PracticeDef {
  id: string;
  name: string;
  cadenceHuman: string;
  intention: string | null;
  entity: { name: string; glyph: string } | null;
  seed: number;
  density: number;
  streakLabel: string;
}

const DEFAULT_PRACTICES: readonly PracticeDef[] = [
  {
    id: "grounding",
    name: "Morning grounding",
    cadenceHuman: "Daily at dawn",
    intention:
      "Begin the day on my own ground before anything is asked of me.",
    entity: null,
    seed: 2,
    density: 0.74,
    streakLabel: "day streak",
  },
  {
    id: "hekate",
    name: "Devotion to Hekate",
    cadenceHuman: "Every dark moon",
    intention: "Tend the crossroads; keep the lamp lit.",
    entity: { name: "Hekate", glyph: "☽" },
    seed: 5,
    density: 0.92,
    streakLabel: "kept in a row",
  },
  {
    id: "lbrp",
    name: "Banishing before sleep",
    cadenceHuman: "Daily before sleep",
    intention: null,
    entity: { name: "The Threshold Guardian", glyph: "⛧" },
    seed: 9,
    density: 0.6,
    streakLabel: "day streak",
  },
];

const TODAY_LONG_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function DailyPracticeRoute() {
  // Per-practice today status. Defaults mirror the mockup demo state.
  const [todayMap, setTodayMap] = useState<Record<string, TodayStatus>>({
    grounding: "pending",
    hekate: "done",
    lbrp: "done",
  });

  useTopbar(
    () => ({
      title: "Daily practice",
      subtitle:
        "The practices you set yourself — kept, or not, and recorded either way",
    }),
    [],
  );

  const todayLong = useMemo(() => TODAY_LONG_FORMAT.format(new Date()), []);

  const practices: DailyPractice[] = useMemo(
    () =>
      DEFAULT_PRACTICES.map((d) => {
        const status: TodayStatus = todayMap[d.id] ?? "pending";
        const history = mockHistory(d.seed, d.density);
        // Today (last slot) reflects the live status.
        history[34] =
          status === "done"
            ? "done"
            : status === "skipped"
              ? "skip"
              : "miss";
        return {
          id: d.id,
          name: d.name,
          cadenceHuman: d.cadenceHuman,
          intention: d.intention,
          entity: d.entity,
          status,
          streak: streakOf(history, status),
          streakLabel: d.streakLabel,
          history,
        };
      }),
    [todayMap],
  );

  const update = (id: string, status: TodayStatus) =>
    setTodayMap((m) => ({ ...m, [id]: status }));

  const handleDefine = (draft: DefinePracticeDraft) => {
    // TODO: POST /api/v1/practices once the backend lands. For now
    // surface a toast acknowledging the draft.
    Toast.push({
      tone: "success",
      title: "Practice noted",
      body: `"${draft.name}" — ${draft.cadence}. Backend wiring lands with the practices API.`,
    });
  };

  return (
    <DailyPracticeTracker
      practices={practices}
      todayLong={todayLong}
      beings={["Hekate", "Hermes", "The Threshold Guardian"]}
      onComplete={(id) => update(id, "done")}
      onSkip={(id) => update(id, "skipped")}
      onReset={(id) => update(id, "pending")}
      onDefine={handleDefine}
      liberReshHref="/"
    />
  );
}
