/**
 * Tetraktys ladder components (H12 Sprint F2).
 *
 * Under test: the figure as navigation (current lit / walked marked /
 * locked dimmed, serpent path dashed in the fixed order), the sealed
 * lockout (counts only — no titles leak), the pass action gated to
 * the current sphere with all required work done, and the progress
 * phrase (never a bar, never a percentage).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SphereRead } from "../api/types.js";
import { SERPENT_ORDER, tetraktysLayout } from "../practice/tetraktys.js";
import { LadderProgressPhrase } from "./LadderProgressPhrase.js";
import { SphereDetailPanel, nextSphereOnWalk } from "./SphereDetailPanel.js";
import { TetraktysFigure, type TetraktysFigureSphere } from "./TetraktysFigure.js";

const SPHERES: TetraktysFigureSphere[] = SERPENT_ORDER.map((n, i) => ({
  number: n,
  name: `S${n}`,
  state: i === 0 ? "done" : i === 1 ? "current" : "locked",
}));

function sphere(overrides: Partial<SphereRead>): SphereRead {
  return {
    number: 9,
    name: "Ennead",
    walk_position: 2,
    state: "current",
    sealed: false,
    item_counts: { total: 2, completed: 1, required_for_gate: 1 },
    items: [
      {
        id: "item-done",
        kind: "practice",
        title: "Nine nights of the Lesser Banishing at dusk",
        notes: null,
        required_for_gate: true,
        completed_at: "2026-07-18T21:00:00+03:00",
        evidence_entry_id: "entry-9",
      },
      {
        id: "item-open",
        kind: "reading",
        title: "Iamblichus, De Mysteriis I–III",
        notes: null,
        required_for_gate: false,
        completed_at: null,
        evidence_entry_id: null,
      },
    ],
    gate: { requirements: null, passed_at: null, countersign: null, initiation_id: null },
    ...overrides,
  };
}

describe("TetraktysFigure", () => {
  it("renders ten sphere nodes over a dashed serpent path", () => {
    const { container } = render(<TetraktysFigure spheres={SPHERES} />);
    expect(container.querySelectorAll("[data-sphere]")).toHaveLength(10);
    const path = container.querySelector("[data-serpent-path]") as SVGPolylineElement;
    expect(path).not.toBeNull();
    expect(path.getAttribute("stroke-dasharray")).toBe("3 4");
  });

  it("threads the serpent through the spheres in the fixed order", () => {
    const { container } = render(<TetraktysFigure spheres={SPHERES} />);
    const path = container.querySelector("[data-serpent-path]") as SVGPolylineElement;
    const layout = tetraktysLayout(320, 300, { top: 40, rowGap: 72, step: 76 });
    expect(path.getAttribute("points")).toBe(layout.serpentPoints);
    // First stop is sphere 10, last is sphere 1.
    const pairs = (path.getAttribute("points") ?? "").split(" ");
    expect(pairs[0]).toBe(`${layout.byNumber[10].x},${layout.byNumber[10].y}`);
    expect(pairs[9]).toBe(`${layout.byNumber[1].x},${layout.byNumber[1].y}`);
  });

  it("lights current, marks walked, dims locked", () => {
    const { container } = render(<TetraktysFigure spheres={SPHERES} />);
    const current = container.querySelector('[data-sphere="9"]') as SVGGElement;
    expect(current.getAttribute("data-state")).toBe("current");
    expect(current.querySelector("circle")?.getAttribute("stroke")).toBe("var(--sphere-current)");
    const done = container.querySelector('[data-sphere="10"]') as SVGGElement;
    expect(done.getAttribute("data-state")).toBe("done");
    // Walked spheres carry the check mark.
    expect(done.querySelector("path")).not.toBeNull();
    const locked = container.querySelector('[data-sphere="1"]') as SVGGElement;
    expect(locked.getAttribute("data-state")).toBe("locked");
    expect(locked.getAttribute("opacity")).toBe("0.45");
  });

  it("is navigation: nodes are buttons with accessible names, click + keyboard select", () => {
    const onSelect = vi.fn();
    const { container } = render(<TetraktysFigure spheres={SPHERES} onSelect={onSelect} />);
    const node = container.querySelector('[data-sphere="9"]') as SVGGElement;
    expect(node.getAttribute("role")).toBe("button");
    expect(node.getAttribute("tabindex")).toBe("0");
    expect(node.getAttribute("aria-label")).toContain("Sphere 9");
    fireEvent.click(node);
    expect(onSelect).toHaveBeenCalledWith(9);
    fireEvent.keyDown(container.querySelector('[data-sphere="1"]') as SVGGElement, {
      key: "Enter",
    });
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

describe("SphereDetailPanel — unlocked", () => {
  it("lists curriculum items with kind chips and dated evidence links", () => {
    const { container } = render(<SphereDetailPanel sphere={sphere({})} />);
    // The required item appears in the curriculum list AND the gate checklist.
    expect(
      screen.getAllByText("Nine nights of the Lesser Banishing at dusk").length,
    ).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('[data-kind-chip="practice"]')).not.toBeNull();
    expect(container.querySelector('[data-kind-chip="reading"]')).not.toBeNull();
    const evidence = container.querySelector("[data-evidence-link]") as HTMLAnchorElement;
    expect(evidence).not.toBeNull();
    expect(evidence.getAttribute("href")).toBe("/editor/entry-9");
    expect(evidence.textContent).toMatch(/evidence ·/);
  });

  it("offers Mark done only for open items on the current sphere", () => {
    const onCompleteItem = vi.fn();
    const { container } = render(
      <SphereDetailPanel sphere={sphere({})} onCompleteItem={onCompleteItem} />,
    );
    const buttons = container.querySelectorAll('[data-action="complete-item"]');
    expect(buttons).toHaveLength(1); // only the open item
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onCompleteItem).toHaveBeenCalledWith(expect.objectContaining({ id: "item-open" }));
  });

  it("enables the pass action only when every required item is complete", () => {
    const onPassGate = vi.fn();
    const { container, rerender } = render(
      <SphereDetailPanel sphere={sphere({})} onPassGate={onPassGate} />,
    );
    let pass = container.querySelector('[data-action="pass-gate"]') as HTMLButtonElement;
    expect(pass).not.toBeNull();
    expect(pass).not.toBeDisabled(); // the one required item is complete
    fireEvent.click(pass);
    expect(onPassGate).toHaveBeenCalledTimes(1);

    // An open required item blocks the gate.
    const blocked = sphere({});
    blocked.items = (blocked.items ?? []).map((i) =>
      i.id === "item-done" ? { ...i, completed_at: null, evidence_entry_id: null } : i,
    );
    rerender(<SphereDetailPanel sphere={blocked} onPassGate={onPassGate} />);
    pass = container.querySelector('[data-action="pass-gate"]') as HTMLButtonElement;
    expect(pass).toBeDisabled();
  });

  it("renders no pass action at all on a walked sphere", () => {
    const { container } = render(
      <SphereDetailPanel
        sphere={sphere({
          state: "done",
          gate: {
            requirements: null,
            passed_at: "2026-05-14T12:00:00+03:00",
            countersign: "the preceptor",
            initiation_id: null,
          },
        })}
        onPassGate={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-action="pass-gate"]')).toBeNull();
    expect(screen.getByText(/Gate passed/)).toBeInTheDocument();
  });

  it("shows the sealed initiation record once the gate is passed", () => {
    const { container } = render(
      <SphereDetailPanel
        sphere={sphere({
          state: "done",
          gate: {
            requirements: null,
            passed_at: "2026-05-14T12:00:00+03:00",
            countersign: "two witnesses of the Order",
            initiation_id: "init-1",
          },
        })}
      />,
    );
    const record = container.querySelector("[data-initiation-record]") as HTMLElement;
    expect(record).not.toBeNull();
    expect(record.style.background).toBe("var(--seal-soft)");
    expect(screen.getByText("Sealed record")).toBeInTheDocument();
    expect(screen.getByText(/Oath text held sealed — visible only to you/)).toBeInTheDocument();
  });
});

describe("SphereDetailPanel — sealed lockout", () => {
  const LOCKED = sphere({
    number: 8,
    name: "Ogdoad",
    state: "locked",
    sealed: true,
    item_counts: { total: 4, completed: 0, required_for_gate: 3 },
    items: null,
    gate: null,
  });

  it("renders counts only — no item titles, no gate detail", () => {
    const { container } = render(<SphereDetailPanel sphere={LOCKED} />);
    expect(container.querySelector("[data-sealed-lockout]")).not.toBeNull();
    expect(screen.getByText("4 items · 0 complete · 3 required for the gate")).toBeInTheDocument();
    // Nothing that lists titles or offers actions renders.
    expect(container.querySelector("[data-curriculum-item]")).toBeNull();
    expect(container.querySelector("[data-gate-panel]")).toBeNull();
    expect(container.querySelector('[data-action="pass-gate"]')).toBeNull();
    expect(screen.getByText(/the walk has not reached it/i)).toBeInTheDocument();
  });

  it("wears the seal styling, not an error tone", () => {
    const { container } = render(<SphereDetailPanel sphere={LOCKED} />);
    const box = container.querySelector("[data-sealed-lockout]") as HTMLElement;
    expect(box.style.background).toBe("var(--seal-soft)");
    expect(box.getAttribute("style") ?? "").not.toContain("danger");
  });
});

describe("walk helpers + progress", () => {
  it("nextSphereOnWalk follows the serpent, ending after sphere 1", () => {
    expect(nextSphereOnWalk(10)).toBe(9);
    expect(nextSphereOnWalk(9)).toBe(8);
    expect(nextSphereOnWalk(7)).toBe(4);
    expect(nextSphereOnWalk(6)).toBe(3);
    expect(nextSphereOnWalk(1)).toBeNull();
  });

  it("LadderProgressPhrase renders the phrase and never a bar or percentage", () => {
    const { container } = render(
      <LadderProgressPhrase progress={{ current_sphere: 9, phrase: "Sphere 9 · Ennead" }} />,
    );
    expect(screen.getByText("Sphere 9 · Ennead")).toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.textContent).not.toContain("%");
  });
});
