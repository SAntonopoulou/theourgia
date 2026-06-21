import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  type Obligation,
  ObligationTable,
} from "./index.js";

const ours: Obligation[] = [
  {
    id: "o1",
    description: "Bring milk to Brigid each Sunday for a year.",
    status: "in-progress",
    dueRelative: "Sunday",
  },
  {
    id: "o2",
    description: "Pour the daily libation at dawn.",
    status: "overdue",
    dueRelative: "2 weeks ago",
  },
];

const theirs: Obligation[] = [
  {
    id: "t1",
    description: "Tend the household hearth.",
    status: "fulfilled",
    fulfilledAt: "2026-04-12T08:00:00Z",
  },
];

describe("ObligationTable", () => {
  it("renders both column headings + canonical labels", () => {
    render(<ObligationTable ours={ours} theirs={theirs} onFulfill={vi.fn()} />);
    expect(screen.getByText("What I promised")).toBeInTheDocument();
    expect(screen.getByText("What they promised")).toBeInTheDocument();
  });

  it("honors heading overrides", () => {
    render(
      <ObligationTable
        ours={ours}
        theirs={theirs}
        oursLabel="Mine"
        theirsLabel="Hers"
        onFulfill={vi.fn()}
      />,
    );
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByText("Hers")).toBeInTheDocument();
  });

  it("status pills carry the right --ob-* tokens", () => {
    render(<ObligationTable ours={ours} theirs={theirs} onFulfill={vi.fn()} />);
    const overdue = screen.getAllByText("Overdue")[0].closest("span")!;
    expect(overdue.dataset.status).toBe("overdue");
    const fulfilled = screen.getAllByText("Fulfilled")[0].closest("span")!;
    expect(fulfilled.dataset.status).toBe("fulfilled");
  });

  it("overdue card carries data-obligation-status='overdue' (visual treatment is care-amber, never red)", () => {
    // jsdom silently drops `color-mix(...)` values from the inline
    // style attribute, so the rendered border-color isn't reliably
    // inspectable in unit tests. We assert the structural marker
    // here (the data-attribute the styling keys off); the actual
    // amber border is guarded by the Playwright visual-regression
    // baseline.
    const { container } = render(
      <ObligationTable ours={ours} theirs={theirs} onFulfill={vi.fn()} />,
    );
    const overdueCard = container.querySelector(
      '[data-obligation-status="overdue"]',
    ) as HTMLElement;
    expect(overdueCard).not.toBeNull();
    const inline = overdueCard.getAttribute("style") ?? "";
    // Whatever style was retained must not contain --danger or any
    // red-leaning token — per S3.2 of the H01-H03 supplement, no
    // "negative" state in the Phase-05 cluster uses danger semantics.
    expect(inline).not.toContain("danger");
    expect(inline).not.toContain("--c-working");
  });

  it("empty side shows the canonical empty message", () => {
    render(<ObligationTable ours={[]} theirs={theirs} onFulfill={vi.fn()} />);
    expect(
      screen.getByText(/No obligations on this side/i),
    ).toBeInTheDocument();
  });

  it("'Mark fulfilled' opens the inline confirm", async () => {
    render(<ObligationTable ours={ours} theirs={theirs} onFulfill={vi.fn()} />);
    const user = userEvent.setup();
    const buttons = screen.getAllByText("Mark fulfilled");
    await user.click(buttons[0]);
    expect(screen.getByText("Mark fulfilled?")).toBeInTheDocument();
    expect(screen.getByLabelText("Fulfilled at")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("fulfilled / waived obligations DO NOT show Mark fulfilled", () => {
    render(<ObligationTable ours={ours} theirs={theirs} onFulfill={vi.fn()} />);
    // theirs has one fulfilled obligation; only ours[0] + ours[1] show buttons
    expect(screen.getAllByText("Mark fulfilled")).toHaveLength(2);
  });

  it("Confirm calls onFulfill with side + obligation id + payload", async () => {
    const onFulfill = vi.fn();
    render(
      <ObligationTable ours={ours} theirs={theirs} onFulfill={onFulfill} />,
    );
    const user = userEvent.setup();
    const buttons = screen.getAllByText("Mark fulfilled");
    await user.click(buttons[0]); // ours[0] = id "o1"
    await user.type(screen.getByLabelText("Notes"), "Done at noon.");
    await user.click(screen.getByText("Confirm"));
    expect(onFulfill).toHaveBeenCalledTimes(1);
    const [side, id, payload] = onFulfill.mock.calls[0];
    expect(side).toBe("ours");
    expect(id).toBe("o1");
    expect(payload.notes).toBe("Done at noon.");
    expect(typeof payload.fulfilledAt).toBe("string");
  });

  it("Cancel closes the inline form without calling onFulfill", async () => {
    const onFulfill = vi.fn();
    render(
      <ObligationTable ours={ours} theirs={theirs} onFulfill={onFulfill} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getAllByText("Mark fulfilled")[0]);
    await user.click(screen.getByText("Cancel"));
    expect(onFulfill).not.toHaveBeenCalled();
    expect(screen.queryByText("Mark fulfilled?")).toBeNull();
  });

  it("obligations stay in entered order (no auto-sort)", () => {
    const reordered: Obligation[] = [
      { id: "a", description: "Apple", status: "fulfilled" },
      { id: "b", description: "Banana", status: "overdue" },
      { id: "c", description: "Cherry", status: "pending" },
    ];
    render(
      <ObligationTable ours={reordered} theirs={[]} onFulfill={vi.fn()} />,
    );
    const oursColumn = screen
      .getByText("What I promised")
      .closest("section")!;
    const cards = within(oursColumn).getAllByText(/Apple|Banana|Cherry/);
    expect(cards.map((c) => c.textContent)).toEqual([
      "Apple",
      "Banana",
      "Cherry",
    ]);
  });

  it("renders notes when present", () => {
    const withNotes: Obligation = {
      id: "n1",
      description: "Light a candle",
      status: "pending",
      notes: "On the household shrine.",
    };
    render(
      <ObligationTable ours={[withNotes]} theirs={[]} onFulfill={vi.fn()} />,
    );
    expect(screen.getByText("On the household shrine.")).toBeInTheDocument();
  });
});
