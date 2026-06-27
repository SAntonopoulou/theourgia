/**
 * AgentTaskComposer — H10 Cluster C6 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentTaskComposerSurface } from "./AgentTaskComposerSurface.js";
import { TASK_HINT } from "./copy.js";

const SCOPES = [
  {
    id: "installed",
    label: "All it was granted at install — divination, beings, synchronicity",
  },
  { id: "recent", label: "For this task, only the last 30 days" },
  { id: "tag", label: "For this task, only entries tagged #hekate" },
];

const PREAMBLE =
  "Ask the companion to look across your readings and surface what recurs. The meaning stays yours to find.";

describe("AgentTaskComposerSurface", () => {
  test("preamble renders verbatim from the prop", () => {
    render(
      <AgentTaskComposerSurface preamble={PREAMBLE} scopes={SCOPES} />,
    );
    expect(screen.getByText(PREAMBLE)).toBeInTheDocument();
  });

  test("rule 54 — task hint uses 'surface'/'draw' tone, NOT 'interpret'", () => {
    expect(TASK_HINT.toLowerCase()).toContain("surface");
    expect(TASK_HINT.toLowerCase()).toContain("draw my attention to");
    expect(TASK_HINT.toLowerCase()).not.toContain("interpret");
    expect(TASK_HINT.toLowerCase()).not.toContain("decode");
    expect(TASK_HINT.toLowerCase()).not.toContain("tell you what");
  });

  test("Start is disabled until task text is non-empty", () => {
    render(
      <AgentTaskComposerSurface preamble={PREAMBLE} scopes={SCOPES} />,
    );
    const start = screen.getByText("Start task");
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your task"), {
      target: { value: "Find resonances between my last 5 Hekate readings" },
    });
    expect(start).toBeEnabled();
  });

  test("default scope is the first option", () => {
    render(
      <AgentTaskComposerSurface preamble={PREAMBLE} scopes={SCOPES} />,
    );
    const installed = screen.getByRole("radio", {
      name: /All it was granted at install/i,
    });
    expect(installed).toHaveAttribute("aria-checked", "true");
  });

  test("clicking a different scope flips selection", () => {
    render(
      <AgentTaskComposerSurface preamble={PREAMBLE} scopes={SCOPES} />,
    );
    const tag = screen.getByRole("radio", {
      name: /only entries tagged #hekate/i,
    });
    fireEvent.click(tag);
    expect(tag).toHaveAttribute("aria-checked", "true");
  });

  test("Start fires onStart with task + scopeId", () => {
    const onStart = vi.fn();
    render(
      <AgentTaskComposerSurface
        preamble={PREAMBLE}
        scopes={SCOPES}
        onStart={onStart}
      />,
    );
    fireEvent.change(screen.getByLabelText("Your task"), {
      target: { value: "Surface dark-moon resonances" },
    });
    fireEvent.click(
      screen.getByRole("radio", {
        name: /only the last 30 days/i,
      }),
    );
    fireEvent.click(screen.getByText("Start task"));
    expect(onStart).toHaveBeenCalledWith({
      task: "Surface dark-moon resonances",
      scopeId: "recent",
    });
  });

  test("disabledReason renders + keeps Start disabled (cost cap hit)", () => {
    render(
      <AgentTaskComposerSurface
        preamble={PREAMBLE}
        scopes={SCOPES}
        disabledReason="This agent has reached its monthly cost cap."
      />,
    );
    fireEvent.change(screen.getByLabelText("Your task"), {
      target: { value: "x" },
    });
    expect(screen.getByText("Start task")).toBeDisabled();
    expect(
      screen.getByText(/This agent has reached its monthly cost cap/i),
    ).toBeInTheDocument();
  });

  test("scope hint states scope NEVER widens", () => {
    render(
      <AgentTaskComposerSurface preamble={PREAMBLE} scopes={SCOPES} />,
    );
    expect(
      screen.getByText(
        /You can restrict its granted access, never widen it/i,
      ),
    ).toBeInTheDocument();
  });
});
