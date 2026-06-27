/**
 * AgentActivityLog — H10 Cluster C11 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentActivityLogSurface } from "./AgentActivityLogSurface.js";
import type { ActivityRunRow } from "./AgentActivityLogSurface.js";

const ROWS: ActivityRunRow[] = [
  {
    id: "r1",
    time: "27 Jun 11:48",
    summary: "Read 3 past Hekate readings and noted 2 recurring symbols.",
    outcome: "completed",
    tokensLabel: "7.5K",
  },
  {
    id: "r2",
    time: "24 Jun 21:40",
    summary: "Halted by you after surfacing the first pattern.",
    outcome: "halted",
    tokensLabel: "2.1K",
  },
  {
    id: "r3",
    time: "20 Jun 08:55",
    summary: "Reached the monthly cost cap mid-run; partial output preserved.",
    outcome: "errored",
    tokensLabel: "4.4K",
  },
];

describe("AgentActivityLogSurface", () => {
  test("rule 55 — every row shows the human-readable summary verbatim", () => {
    render(<AgentActivityLogSurface rows={ROWS} />);
    expect(
      screen.getByText(
        /Read 3 past Hekate readings and noted 2 recurring symbols/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Halted by you after surfacing the first pattern/i),
    ).toBeInTheDocument();
  });

  test("rule 55 — there is NO raw MCP trace anywhere in the row text", () => {
    const { container } = render(
      <AgentActivityLogSurface rows={ROWS} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("mcp.call");
    expect(text).not.toContain("→ model.generate");
  });

  test("outcome chips render in neutral chrome — NO --danger anywhere", () => {
    const { container } = render(
      <AgentActivityLogSurface rows={ROWS} />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain("--danger");
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("halted")).toBeInTheDocument();
    expect(screen.getByText("errored")).toBeInTheDocument();
  });

  test("filters fire callbacks", () => {
    const onTimeRangeChange = vi.fn();
    const onOutcomeChange = vi.fn();
    render(
      <AgentActivityLogSurface
        rows={ROWS}
        onTimeRangeChange={onTimeRangeChange}
        onOutcomeChange={onOutcomeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Time range filter"), {
      target: { value: "all_time" },
    });
    expect(onTimeRangeChange).toHaveBeenCalledWith("all_time");
    fireEvent.change(screen.getByLabelText("Outcome filter"), {
      target: { value: "errored" },
    });
    expect(onOutcomeChange).toHaveBeenCalledWith("errored");
  });

  test("Transcript button fires onOpenTranscript with row id", () => {
    const onOpenTranscript = vi.fn();
    render(
      <AgentActivityLogSurface
        rows={ROWS}
        onOpenTranscript={onOpenTranscript}
      />,
    );
    const buttons = screen.getAllByText("Transcript");
    fireEvent.click(buttons[2]!);
    expect(onOpenTranscript).toHaveBeenCalledWith("r3");
  });

  test("empty list shows calm placeholder", () => {
    render(<AgentActivityLogSurface rows={[]} />);
    expect(
      screen.getByText(/No runs in this window/i),
    ).toBeInTheDocument();
  });
});
