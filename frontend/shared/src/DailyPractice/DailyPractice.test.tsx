import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { CompletionStatus } from "../practice/index.js";
import { DailyPracticeTracker, type DailyPractice } from "./DailyPracticeTracker.js";
import { DefinePracticeDrawer } from "./DefinePracticeDrawer.js";
import { Last7DaysDots } from "./Last7DaysDots.js";
import { PracticeCard } from "./PracticeCard.js";
import { PracticeStatusIcon } from "./PracticeStatusIcon.js";
import { StreakGrid35 } from "./StreakGrid35.js";
import { TodayStatusChip } from "./TodayStatusChip.js";
import {
  EMPTY_STATE_BODY,
  EMPTY_STATE_TITLE,
  PRACTICE_STATUS_SUB,
} from "./copy.js";

const fullHistory = (cadence: "done" | "skip" | "miss"): CompletionStatus[] =>
  Array.from({ length: 35 }, () => cadence);

const morningGrounding: DailyPractice = {
  id: "grounding",
  name: "Morning grounding",
  cadenceHuman: "Daily at dawn",
  intention:
    "Begin the day on my own ground before anything is asked of me.",
  entity: null,
  status: "pending",
  streak: 12,
  streakLabel: "day streak",
  history: fullHistory("done"),
};

const devotionToHekate: DailyPractice = {
  id: "hekate",
  name: "Devotion to Hekate",
  cadenceHuman: "Every dark moon",
  intention: "Tend the crossroads; keep the lamp lit.",
  entity: { name: "Hekate", glyph: "☽" },
  status: "done",
  streak: 6,
  streakLabel: "kept in a row",
  history: fullHistory("done"),
};

// ─── StreakGrid35 ─────────────────────────────────────────────────

describe("StreakGrid35", () => {
  it("renders exactly 35 cells", () => {
    const { container } = render(
      <StreakGrid35 history={fullHistory("done")} />,
    );
    expect(container.querySelectorAll("[data-cell-status]")).toHaveLength(35);
  });

  it("uses --accent for done · --skip-soft for skip · --bg-3 for miss", () => {
    const history: CompletionStatus[] = [
      ...Array.from({ length: 33 }, () => "miss" as CompletionStatus),
      "skip",
      "done",
    ];
    const { container } = render(<StreakGrid35 history={history} />);
    const cells = container.querySelectorAll("[data-cell-status]");
    const missCell = cells[0] as HTMLElement;
    const skipCell = cells[33] as HTMLElement;
    const doneCell = cells[34] as HTMLElement;
    expect(missCell.style.background).toBe("var(--bg-3)");
    expect(skipCell.style.background).toBe("var(--skip-soft)");
    expect(doneCell.style.background).toBe("var(--accent)");
  });

  it("the last cell is marked today + carries the bullseye boxShadow", () => {
    const { container } = render(
      <StreakGrid35 history={fullHistory("done")} />,
    );
    const cells = container.querySelectorAll("[data-cell-status]");
    const todayCell = cells[34] as HTMLElement;
    expect(todayCell.getAttribute("data-today")).toBe("true");
    expect(todayCell.style.boxShadow).toContain("var(--accent)");
  });

  it("uses the verbatim cell tooltips Kept / Skipped / Not kept", () => {
    const history: CompletionStatus[] = ["done", "skip", "miss"];
    const { container } = render(<StreakGrid35 history={history} />);
    const cells = container.querySelectorAll("[data-cell-status]");
    expect((cells[0] as HTMLElement).title).toBe("Kept");
    expect((cells[1] as HTMLElement).title).toBe("Skipped");
    expect((cells[2] as HTMLElement).title).toBe("Not kept");
  });

  it("never uses --danger anywhere in the rendered grid", () => {
    const { container } = render(
      <StreakGrid35
        history={[
          ...Array.from({ length: 33 }, () => "miss" as CompletionStatus),
          "skip",
          "miss",
        ]}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── Last7DaysDots ────────────────────────────────────────────────

describe("Last7DaysDots", () => {
  it("renders exactly seven dots", () => {
    const { container } = render(
      <Last7DaysDots history={fullHistory("done")} />,
    );
    expect(container.querySelectorAll("[data-day-status]")).toHaveLength(7);
  });

  it("labels the seven days M T W T F S S", () => {
    const { container } = render(
      <Last7DaysDots history={fullHistory("miss")} />,
    );
    const labels = Array.from(
      container.querySelectorAll("[data-day-status] + span, [data-day-status] ~ span, span"),
    )
      .filter((el) => /^[MTWFS]$/.test(el.textContent ?? ""))
      .map((el) => el.textContent);
    expect(labels.length).toBeGreaterThanOrEqual(7);
  });

  it("left-pads with miss when history shorter than 7", () => {
    const { container } = render(
      <Last7DaysDots history={["done", "done"] as CompletionStatus[]} />,
    );
    const dots = container.querySelectorAll("[data-day-status]");
    expect(dots).toHaveLength(7);
    expect(dots[0]?.getAttribute("data-day-status")).toBe("miss");
    expect(dots[6]?.getAttribute("data-day-status")).toBe("done");
  });
});

// ─── PracticeStatusIcon ───────────────────────────────────────────

describe("PracticeStatusIcon", () => {
  it("done uses solid --accent background + check icon", () => {
    const { container } = render(<PracticeStatusIcon status="done" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-status")).toBe("done");
    expect(root.style.background).toBe("var(--accent)");
    expect(root.querySelector("svg")).not.toBeNull();
  });

  it("skipped uses dashed --line-2 border + --skip dash", () => {
    const { container } = render(<PracticeStatusIcon status="skipped" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-status")).toBe("skipped");
    expect(root.style.borderStyle).toBe("dashed");
    expect(root.style.borderColor).toBe("var(--line-2)");
  });

  it("pending uses solid --line-2 border + empty interior", () => {
    const { container } = render(<PracticeStatusIcon status="pending" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-status")).toBe("pending");
    expect(root.style.borderStyle).toBe("solid");
    expect(root.children.length).toBe(0);
  });

  it("never uses --danger for any status", () => {
    for (const status of ["done", "skipped", "pending"] as const) {
      const { container } = render(<PracticeStatusIcon status={status} />);
      expect(container.innerHTML).not.toContain("--danger");
    }
  });
});

// ─── TodayStatusChip ──────────────────────────────────────────────

describe("TodayStatusChip", () => {
  it("renders the name + canonical label per status", () => {
    render(<TodayStatusChip name="Morning grounding" status="done" />);
    expect(screen.getByText("Morning grounding")).toBeInTheDocument();
    expect(screen.getByText("Kept")).toBeInTheDocument();
  });

  it("colours skipped chip with --skip, not --danger", () => {
    const { container } = render(
      <TodayStatusChip name="X" status="skipped" />,
    );
    expect(container.innerHTML).toContain("var(--skip)");
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── PracticeCard ─────────────────────────────────────────────────

describe("PracticeCard", () => {
  it("renders title + cadence pill + intention + streak number", () => {
    render(
      <PracticeCard
        id="grounding"
        name="Morning grounding"
        cadenceHuman="Daily at dawn"
        intention="Begin the day on my own ground before anything is asked of me."
        status="pending"
        streak={12}
        streakLabel="day streak"
        history={fullHistory("done")}
      />,
    );
    expect(screen.getByText("Morning grounding")).toBeInTheDocument();
    expect(screen.getByText("Daily at dawn")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Begin the day on my own ground before anything is asked of me.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });

  it("hides the entity pill when entity is null", () => {
    const { container } = render(
      <PracticeCard
        id="g"
        name="X"
        cadenceHuman="Daily"
        status="pending"
        streak={1}
        streakLabel="day streak"
        history={fullHistory("done")}
      />,
    );
    expect(container.querySelector("[data-entity-pill]")).toBeNull();
  });

  it("renders the entity pill with glyph when present", () => {
    render(
      <PracticeCard
        id="h"
        name="Devotion to Hekate"
        cadenceHuman="Every dark moon"
        entity={{ name: "Hekate", glyph: "☽" }}
        status="done"
        streak={6}
        streakLabel="kept in a row"
        history={fullHistory("done")}
      />,
    );
    expect(screen.getByText("Hekate")).toBeInTheDocument();
  });

  it("pending status: Mark complete + Note a skip buttons; verbatim sub-copy", () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    render(
      <PracticeCard
        id="g"
        name="X"
        cadenceHuman="Daily"
        status="pending"
        streak={0}
        streakLabel="day streak"
        history={fullHistory("miss")}
        onComplete={onComplete}
        onSkip={onSkip}
      />,
    );
    expect(screen.getByText("Mark complete")).toBeInTheDocument();
    expect(screen.getByText("Note a skip")).toBeInTheDocument();
    expect(
      screen.getByText(PRACTICE_STATUS_SUB.pending),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Mark complete"));
    expect(onComplete).toHaveBeenCalledWith("g");
    fireEvent.click(screen.getByText("Note a skip"));
    expect(onSkip).toHaveBeenCalledWith("g");
  });

  it("done status: Undo button + verbatim 'Recorded just now' sub-copy", () => {
    const onReset = vi.fn();
    render(
      <PracticeCard
        id="g"
        name="X"
        cadenceHuman="Daily"
        status="done"
        streak={5}
        streakLabel="day streak"
        history={fullHistory("done")}
        onReset={onReset}
      />,
    );
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(
      screen.getByText(PRACTICE_STATUS_SUB.done),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mark complete")).toBeNull();
    fireEvent.click(screen.getByText("Undo"));
    expect(onReset).toHaveBeenCalledWith("g");
  });

  it("skipped status: 'Mark complete instead' + the wellbeing copy verbatim", () => {
    const onComplete = vi.fn();
    render(
      <PracticeCard
        id="g"
        name="X"
        cadenceHuman="Daily"
        status="skipped"
        streak={0}
        streakLabel="day streak"
        history={fullHistory("skip")}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByText("Mark complete instead")).toBeInTheDocument();
    // The load-bearing wellbeing string.
    expect(
      screen.getByText(
        "A skip is information, not a failure. The record holds it plainly.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Mark complete instead"));
    expect(onComplete).toHaveBeenCalledWith("g");
  });

  it("renders kept-count derived from history (countKept) in the streak grid eyebrow", () => {
    // 30 done + 5 skip → "30 of 35 kept"
    const history: CompletionStatus[] = [
      ...Array.from({ length: 30 }, () => "done" as CompletionStatus),
      ...Array.from({ length: 5 }, () => "skip" as CompletionStatus),
    ];
    render(
      <PracticeCard
        id="g"
        name="X"
        cadenceHuman="Daily"
        status="pending"
        streak={0}
        streakLabel="day streak"
        history={history}
      />,
    );
    expect(screen.getByText(/30 of 35 kept/)).toBeInTheDocument();
  });

  it("never uses --danger for any status path", () => {
    for (const status of ["done", "skipped", "pending"] as const) {
      const { container } = render(
        <PracticeCard
          id="g"
          name="X"
          cadenceHuman="Daily"
          status={status}
          streak={0}
          streakLabel="day streak"
          history={fullHistory("done")}
        />,
      );
      expect(container.innerHTML).not.toContain("--danger");
    }
  });
});

// ─── DefinePracticeDrawer ─────────────────────────────────────────

describe("DefinePracticeDrawer", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <DefinePracticeDrawer open={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the header + 6 cadence chips when open", () => {
    render(<DefinePracticeDrawer open onClose={() => {}} />);
    expect(screen.getByText("Define a practice")).toBeInTheDocument();
    expect(
      [
        "Daily",
        "Weekly",
        "Each morning",
        "Before sleep",
        "Every dark moon",
        "Custom…",
      ].every((label) => screen.getByText(label)),
    ).toBeTruthy();
  });

  it("default cadence is 'daily' (post-b108-2fo scrub)", () => {
    const { container } = render(
      <DefinePracticeDrawer open onClose={() => {}} />,
    );
    const daily = container.querySelector(
      '[data-cadence="daily"]',
    ) as HTMLElement;
    expect(daily.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<DefinePracticeDrawer open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSave with the current draft (empty defaults post-scrub)", () => {
    const onSave = vi.fn();
    render(
      <DefinePracticeDrawer
        open
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Save practice"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "",
        cadence: "daily",
        intention: "",
        alsoScheduleOffering: false,
      }),
    );
  });
});

// ─── DailyPracticeTracker (surface shell) ────────────────────────

describe("DailyPracticeTracker", () => {
  it("empty state when no practices: title + body + CTA", () => {
    const { container } = render(<DailyPracticeTracker practices={[]} />);
    expect(container.firstElementChild?.getAttribute("data-state")).toBe(
      "empty",
    );
    expect(screen.getByText(EMPTY_STATE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_STATE_BODY)).toBeInTheDocument();
    expect(
      screen.getByText("Define your first practice"),
    ).toBeInTheDocument();
  });

  it("populated state with two practices + Today band + Liber Resh card", () => {
    const { container } = render(
      <DailyPracticeTracker
        practices={[morningGrounding, devotionToHekate]}
        todayLong="Monday, 22 June 2026"
        hourChip="Saturn — 14:30"
      />,
    );
    expect(container.firstElementChild?.getAttribute("data-state")).toBe(
      "populated",
    );
    expect(screen.getByText("Monday, 22 June 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Liber Resh — solar adoration"),
    ).toBeInTheDocument();
    // Each name appears twice: once in the Today chip, once in the
    // PracticeCard article title — both renderings are expected.
    expect(screen.getAllByText("Morning grounding").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByText("Devotion to Hekate").length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("hides the Liber Resh card when showLiberResh=false", () => {
    const { container } = render(
      <DailyPracticeTracker
        practices={[morningGrounding]}
        showLiberResh={false}
      />,
    );
    expect(container.querySelector("[data-liber-resh-ref]")).toBeNull();
  });

  it("Define a practice button opens the drawer", () => {
    render(<DailyPracticeTracker practices={[morningGrounding]} />);
    expect(screen.queryByText("Save practice")).toBeNull();
    fireEvent.click(screen.getByText("Define a practice"));
    expect(screen.getByText("Save practice")).toBeInTheDocument();
  });

  it("empty-state CTA also opens the drawer", () => {
    render(<DailyPracticeTracker practices={[]} />);
    expect(screen.queryByText("Save practice")).toBeNull();
    fireEvent.click(screen.getByText("Define your first practice"));
    expect(screen.getByText("Save practice")).toBeInTheDocument();
  });

  it("forwards onDefine + closes the drawer on save", () => {
    const onDefine = vi.fn();
    render(
      <DailyPracticeTracker
        practices={[morningGrounding]}
        onDefine={onDefine}
      />,
    );
    fireEvent.click(screen.getByText("Define a practice"));
    fireEvent.click(screen.getByText("Save practice"));
    expect(onDefine).toHaveBeenCalled();
    expect(screen.queryByText("Save practice")).toBeNull();
  });

  it("never uses --danger across the populated surface", () => {
    const { container } = render(
      <DailyPracticeTracker
        practices={[morningGrounding, devotionToHekate]}
        todayLong="Monday, 22 June 2026"
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
