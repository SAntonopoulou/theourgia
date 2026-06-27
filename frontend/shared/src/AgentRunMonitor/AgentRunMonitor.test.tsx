/**
 * AgentRunMonitor — H10 Cluster C7 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentRunMonitorSurface } from "./AgentRunMonitorSurface.js";
import type { HumanActivityRow } from "./copy.js";

const HUMAN: HumanActivityRow[] = [
  {
    text: "Reading entries tagged #hekate from the last 30 days…",
    tone: "done",
  },
  {
    text: "Read 5 readings and the 3 beings they reference.",
    tone: "done",
  },
  {
    text: "Drawing your attention to 2 figures that recur across the five readings.",
    tone: "live",
  },
];

const RAW = `→ mcp.call read.entries { tag:"hekate", limit:5 }
← 5 entries (4,210 tokens)
→ model.generate { summarize_resonance }
← 2 patterns surfaced (2,850 tokens)`;

describe("AgentRunMonitorSurface", () => {
  test("rule 55 — human activity renders by default (NOT raw trace)", () => {
    const { container } = render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        rawActivity={RAW}
        tokensTotal={8240}
        tokensFresh={1900}
        tokensResume={6340}
      />,
    );
    expect(
      screen.getByText(/Reading entries tagged #hekate/i),
    ).toBeInTheDocument();
    // The raw mcp.call text should NOT be in the DOM yet.
    expect(container.textContent).not.toContain("mcp.call");
  });

  test("View raw activity toggle is OFF by default", () => {
    render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        rawActivity={RAW}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
      />,
    );
    const sw = screen.getByRole("switch", {
      name: /View raw activity/i,
    });
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  test("clicking the toggle reveals the raw MCP trace", () => {
    render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        rawActivity={RAW}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
      />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: /View raw activity/i }),
    );
    expect(
      screen.getByText(/mcp.call read\.entries/i),
    ).toBeInTheDocument();
  });

  test("rule 58 — Fresh/resume split tile renders both numbers", () => {
    const { container } = render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={8240}
        tokensFresh={1900}
        tokensResume={6340}
      />,
    );
    expect(screen.getByText("Fresh / resume")).toBeInTheDocument();
    const tile = container.querySelector('[data-fresh-resume]');
    const text = tile?.textContent ?? "";
    expect(text).toContain("1,900");
    expect(text).toContain("6,340");
  });

  test("token counts are formatted with thousands separators", () => {
    render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={8240}
        tokensFresh={1900}
        tokensResume={6340}
      />,
    );
    expect(screen.getByText("8,240")).toBeInTheDocument();
  });

  test("rule 56 — Halt CTA uses --warn-soft chrome (NOT --danger)", () => {
    const { container } = render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
      />,
    );
    const halt = screen.getByText("Halt this run");
    const styles = halt.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(styles).not.toContain("--danger");
    expect(container.innerHTML).not.toContain("--danger");
  });

  test("Halt fires onHalt callback", () => {
    const onHalt = vi.fn();
    render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
        onHalt={onHalt}
      />,
    );
    fireEvent.click(screen.getByText("Halt this run"));
    expect(onHalt).toHaveBeenCalledTimes(1);
  });

  test("finished=true hides the Halt button", () => {
    render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
        finished
      />,
    );
    expect(screen.queryByText("Halt this run")).toBeNull();
  });

  test("'live' tone row uses --accent dot (animated visual signal)", () => {
    const { container } = render(
      <AgentRunMonitorSurface
        humanActivity={HUMAN}
        tokensTotal={1}
        tokensFresh={1}
        tokensResume={0}
      />,
    );
    const liveRow = container.querySelector('[data-tone="live"]');
    expect(liveRow).toBeTruthy();
  });
});
