/**
 * Tetraktys ladder — /order/ladder (H12 Sprint F2, Surface 5).
 *
 * Covered: the figure renders as navigation with the serpent path in
 * the fixed order; the current sphere opens by default; a locked
 * sphere renders the sealed lockout (counts only — no titles leak);
 * completing an item goes through the evidence picker; the pass action
 * exists only on the current sphere with all required work done; the
 * progress phrase renders with no bar and no percentage.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurriculumLadder: vi.fn(),
  getCurriculumProgress: vi.fn(),
  listEntries: vi.fn(),
  completeCurriculumItem: vi.fn(),
  passSphereGate: vi.fn(),
}));

vi.mock("../../data/api.js", () => ({
  apiMethods: mocks,
  apiClient: { request: () => Promise.resolve([]) },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

import { TetraktysLadderRoute } from "../TetraktysLadderRoute.js";

const SERPENT = [10, 9, 8, 7, 4, 5, 6, 3, 2, 1] as const;

function sphereFixture(number: number, state: "done" | "current" | "locked") {
  const sealed = state === "locked";
  return {
    number,
    name: `Sphere-${number}`,
    walk_position: SERPENT.indexOf(number as (typeof SERPENT)[number]) + 1,
    state,
    sealed,
    item_counts: { total: 3, completed: state === "done" ? 3 : 1, required_for_gate: 2 },
    items: sealed
      ? null
      : [
          {
            id: `item-${number}-done`,
            kind: "practice" as const,
            title: `Kept practice of sphere ${number}`,
            notes: null,
            required_for_gate: true,
            completed_at: "2026-07-18T21:00:00+03:00",
            evidence_entry_id: "entry-77",
          },
          {
            id: `item-${number}-open`,
            kind: "reading" as const,
            title: `Open reading of sphere ${number}`,
            notes: null,
            required_for_gate: number === 9,
            completed_at: null,
            evidence_entry_id: null,
          },
        ],
    gate: sealed
      ? null
      : {
          requirements: null,
          passed_at: state === "done" ? "2026-05-14T12:00:00+03:00" : null,
          countersign: state === "done" ? "the preceptor" : null,
          initiation_id: null,
        },
  };
}

const LADDER = {
  spheres: SERPENT.map((n, i) =>
    sphereFixture(n, i === 0 ? "done" : i === 1 ? "current" : "locked"),
  ),
  current_sphere: 9,
};

function withProviders(inner: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{inner}</QueryClientProvider>;
}

beforeEach(() => {
  mocks.getCurriculumLadder.mockReset().mockResolvedValue(LADDER);
  mocks.getCurriculumProgress
    .mockReset()
    .mockResolvedValue({ current_sphere: 9, phrase: "Sphere 9 · Ennead" });
  mocks.listEntries.mockReset().mockResolvedValue([
    {
      id: "entry-77",
      title: "Ninth night, kept",
      type: "working",
      excerpt: "",
      glyph: "ritual",
      created_at: "2026-07-18T21:30:00+03:00",
      updated_at: "2026-07-18T21:30:00+03:00",
    },
  ]);
  mocks.completeCurriculumItem.mockReset().mockResolvedValue({});
  mocks.passSphereGate.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe("TetraktysLadderRoute — the figure as navigation", () => {
  it("renders ten spheres over the dashed serpent path in the fixed order", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelectorAll("[data-sphere]")).toHaveLength(10);
    });
    const path = container.querySelector("[data-serpent-path]") as SVGPolylineElement;
    expect(path.getAttribute("stroke-dasharray")).toBe("3 4");
    // Ten stops, first at sphere 10's coordinates, last at sphere 1's.
    const pairs = (path.getAttribute("points") ?? "").split(" ");
    expect(pairs).toHaveLength(10);
    const node10 = container.querySelector('[data-sphere="10"] circle') as SVGCircleElement;
    expect(pairs[0]).toBe(`${node10.getAttribute("cx")},${node10.getAttribute("cy")}`);
  });

  it("opens the current sphere by default and dims the locked ones", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-component="sphere-detail"]')).not.toBeNull();
    });
    // Current sphere 9's detail is open.
    expect(screen.getByText("Sphere-9")).toBeInTheDocument();
    const locked = container.querySelector('[data-sphere="8"]') as SVGGElement;
    expect(locked.getAttribute("data-state")).toBe("locked");
    expect(locked.getAttribute("opacity")).toBe("0.45");
  });

  it("clicking a locked sphere shows the sealed lockout — counts only, no titles", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-sphere="8"]')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('[data-sphere="8"]') as SVGGElement);
    await screen.findByText(/the walk has not reached it/i);
    expect(screen.getByText("3 items · 1 complete · 2 required for the gate")).toBeInTheDocument();
    // No item titles leak through the seal.
    expect(screen.queryByText(/of sphere 8/)).toBeNull();
    expect(container.querySelector("[data-curriculum-item]")).toBeNull();
  });
});

describe("TetraktysLadderRoute — items + evidence", () => {
  it("completes an item through the evidence picker with a journal entry", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-action="complete-item"]')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('[data-action="complete-item"]') as HTMLElement);
    await screen.findByText("Evidence for the record");
    fireEvent.click(await screen.findByText("Ninth night, kept"));
    await waitFor(() => {
      expect(mocks.completeCurriculumItem).toHaveBeenCalledWith("item-9-open", {
        evidence_entry_id: "entry-77",
      });
    });
  });

  it("links completed items to their evidence entries", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector("[data-evidence-link]")).not.toBeNull();
    });
    expect(
      (container.querySelector("[data-evidence-link]") as HTMLAnchorElement).getAttribute("href"),
    ).toBe("/editor/entry-77");
  });
});

describe("TetraktysLadderRoute — the gate", () => {
  it("disables the pass action while required work is open, enables it when done", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-action="pass-gate"]')).not.toBeNull();
    });
    // Sphere 9 has an open required item — the gate does not open.
    expect(container.querySelector('[data-action="pass-gate"]')).toBeDisabled();

    // With every required item complete the gate becomes passable.
    const passable = {
      ...LADDER,
      spheres: LADDER.spheres.map((s) =>
        s.number === 9
          ? {
              ...s,
              items: (s.items ?? []).map((i) => ({
                ...i,
                completed_at: i.completed_at ?? "2026-07-20T21:00:00+03:00",
              })),
            }
          : s,
      ),
    };
    mocks.getCurriculumLadder.mockResolvedValue(passable);
    cleanup();
    const second = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(second.container.querySelector('[data-action="pass-gate"]')).not.toBeNull();
    });
    const pass = second.container.querySelector('[data-action="pass-gate"]') as HTMLButtonElement;
    expect(pass).not.toBeDisabled();
    fireEvent.click(pass);
    await screen.findByText("Pass the gate?");
    fireEvent.click(screen.getByRole("button", { name: "Pass it" }));
    await waitFor(() => {
      expect(mocks.passSphereGate).toHaveBeenCalledWith(9, { countersign: null });
    });
  });
});

describe("TetraktysLadderRoute — progress", () => {
  it("renders the phrase and never a bar or percentage", async () => {
    const { container } = render(withProviders(<TetraktysLadderRoute />));
    await waitFor(() => {
      expect(container.querySelector('[data-component="ladder-progress-phrase"]')).not.toBeNull();
    });
    expect(screen.getByText("Sphere 9 · Ennead")).toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.textContent).not.toContain("%");
  });
});
