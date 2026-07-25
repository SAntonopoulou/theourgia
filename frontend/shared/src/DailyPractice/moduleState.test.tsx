/**
 * PracticeCard install-by-proof extension (H12 Sprint F2).
 *
 * The card renders the module-state chip and ONLY the legal
 * transitions: candidate→testing; testing→installed|rejected;
 * installed is terminal (no controls); rejected→candidate.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ModuleStatusWire } from "../api/types.js";
import type { CompletionStatus } from "../practice/index.js";
import { PracticeCard } from "./PracticeCard.js";

const history: CompletionStatus[] = Array.from({ length: 35 }, () => "done");

function renderCard(state: ModuleStatusWire, onModuleTransition = vi.fn()) {
  const utils = render(
    <PracticeCard
      id="p1"
      name="Voces before the banishing"
      cadenceHuman="Nightly"
      status="pending"
      streak={9}
      streakLabel="day streak"
      history={history}
      moduleState={state}
      onModuleTransition={onModuleTransition}
    />,
  );
  return { ...utils, onModuleTransition };
}

function transitionTargets(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-module-transition]")).map(
    (b) => b.getAttribute("data-module-transition") ?? "",
  );
}

describe("PracticeCard — install by proof", () => {
  it("renders the state chip next to the title", () => {
    const { container } = renderCard("testing");
    expect(container.querySelector('[data-module-state="testing"]')).not.toBeNull();
  });

  it("candidate offers only Begin a trial", () => {
    const { container } = renderCard("candidate");
    expect(transitionTargets(container)).toEqual(["testing"]);
    expect(screen.getByText("Begin a trial")).toBeInTheDocument();
  });

  it("testing offers install or reject — nothing else", () => {
    const { container } = renderCard("testing");
    expect(transitionTargets(container).sort()).toEqual(["installed", "rejected"]);
  });

  it("installed is terminal — no transition controls render", () => {
    const { container } = renderCard("installed");
    expect(container.querySelector("[data-module-transitions]")).toBeNull();
  });

  it("rejected offers only the re-trial return to candidate", () => {
    const { container } = renderCard("rejected");
    expect(transitionTargets(container)).toEqual(["candidate"]);
    expect(screen.getByText("Return to candidate")).toBeInTheDocument();
  });

  it("fires onModuleTransition with the practice id and the target state", () => {
    const { container, onModuleTransition } = renderCard("testing");
    fireEvent.click(container.querySelector('[data-module-transition="installed"]') as HTMLElement);
    expect(onModuleTransition).toHaveBeenCalledWith("p1", "installed");
  });

  it("renders no chip and no controls when the state is unknown", () => {
    const { container } = render(
      <PracticeCard
        id="p2"
        name="Morning grounding"
        cadenceHuman="Daily"
        status="pending"
        streak={2}
        streakLabel="day streak"
        history={history}
      />,
    );
    expect(container.querySelector("[data-module-state]")).toBeNull();
    expect(container.querySelector("[data-module-transitions]")).toBeNull();
  });
});
