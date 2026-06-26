/**
 * SynchronicityLogSurface tests (H06 §S7.9).
 *
 * Honesty + H06 rule coverage:
 *   - Pattern refresh line uses verbatim "observations only" framing
 *   - Small-sample chip uses --accent (warm invitation), never --warn
 *     / --danger
 *   - Filter chips + search narrow the days/items
 *   - Empty-log state copy is informational
 *   - Capture CTA + Export CTA fire handlers
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PatternCard,
  type SyncLogDay,
  SynchronicityLogSurface,
} from "./index.js";

const DAYS: SyncLogDay[] = [
  {
    date_label: "26 Jun 2026",
    astro_summary: "☉ Cancer · Waning Moon",
    items: [
      {
        id: "s1",
        time_label: "14:32",
        description: "1111 on the clock again, third day running",
        category: "number_sequence",
        intensity: 7,
        entity_label: "☽ Hekate",
      },
      {
        id: "s2",
        time_label: "08:14",
        description: "Raven crossed the path at dawn",
        category: "animal_omen",
        intensity: 6,
      },
    ],
  },
  {
    date_label: "25 Jun 2026",
    astro_summary: null,
    items: [
      {
        id: "s3",
        time_label: "21:02",
        description: "Heard 'crossroads' twice in conversation",
        category: "overheard_speech",
        intensity: 5,
      },
    ],
  },
];

const PATTERNS: PatternCard[] = [
  {
    id: "p1",
    text: "Number-sequence syncs cluster on Saturn hours (n=14, vs 6 expected).",
    stat_label: "n=14 · 2.3× baseline",
    small_sample: false,
  },
  {
    id: "p2",
    text: "Three dream-spillovers in the last 11 days follow the same lunar phase.",
    stat_label: "n=3",
    small_sample: true,
  },
];

describe("SynchronicityLogSurface", () => {
  it("renders the header + Capture CTA + total count line", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
        patterns_last_refreshed_label="Last refreshed 2h ago"
      />,
    );
    expect(container.textContent).toContain("Synchronicity Log");
    expect(container.querySelector("[data-capture-cta]")).toBeTruthy();
    expect(container.textContent).toContain("92 synchronicities recorded");
  });

  it("renders one card per pattern", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    expect(
      container.querySelectorAll("[data-pattern-card]"),
    ).toHaveLength(2);
  });

  it("pattern refresh label reads 'observations only'", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
        patterns_last_refreshed_label="Last refreshed 2h ago"
      />,
    );
    const label = container.querySelector(
      "[data-pattern-refresh-label]",
    ) as HTMLElement;
    expect(label.textContent).toContain("observations only");
    expect(label.textContent).toContain("Last refreshed 2h ago");
  });

  it("small-sample chip uses --accent, never --warn / --danger", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    const chip = container.querySelector(
      "[data-pattern-small-sample]",
    ) as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.style.color).toBe("var(--accent)");
    expect(chip.outerHTML).not.toContain("--warn");
    expect(chip.outerHTML).not.toContain("--danger");
  });

  it("View matching + Dismiss pattern fire their handlers", () => {
    const onViewPattern = vi.fn();
    const onDismissPattern = vi.fn();
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
        onViewPattern={onViewPattern}
        onDismissPattern={onDismissPattern}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-pattern-view='p1']",
      ) as HTMLButtonElement,
    );
    expect(onViewPattern).toHaveBeenCalledWith("p1");
    fireEvent.click(
      container.querySelector(
        "[data-pattern-dismiss='p2']",
      ) as HTMLButtonElement,
    );
    expect(onDismissPattern).toHaveBeenCalledWith("p2");
  });

  it("Day groups render with date label + items", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    const dayGroups = container.querySelectorAll("[data-log-day]");
    expect(dayGroups).toHaveLength(2);
    const items = container.querySelectorAll("[data-log-item]");
    expect(items).toHaveLength(3);
  });

  it("Category chip + entity tag render on items", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    expect(
      container.querySelector(
        "[data-category-chip='number_sequence']",
      ),
    ).toBeTruthy();
    const entityTag = container.querySelector(
      "[data-entity-tag]",
    ) as HTMLElement;
    expect(entityTag).toBeTruthy();
    expect(entityTag.textContent).toContain("Hekate");
  });

  it("Search narrows items by description", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-log-search]") as HTMLInputElement,
      { target: { value: "raven" } },
    );
    const items = container.querySelectorAll("[data-log-item]");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Raven");
  });

  it("Category filter narrows to a single category", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-category-filter='animal_omen']",
      ) as HTMLButtonElement,
    );
    const items = container.querySelectorAll("[data-log-item]");
    expect(items).toHaveLength(1);
    expect(items[0]?.getAttribute("data-log-item")).toBe("s2");
  });

  it("Open-item fires onOpenItem with the item id", () => {
    const onOpenItem = vi.fn();
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
        onOpenItem={onOpenItem}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-log-item='s2']") as HTMLButtonElement,
    );
    expect(onOpenItem).toHaveBeenCalledWith("s2");
  });

  it("Empty-log state renders when filters yield no items", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-log-search]") as HTMLInputElement,
      { target: { value: "zzznothingmatchesthis" } },
    );
    expect(container.querySelector("[data-log-empty]")).toBeTruthy();
  });

  it("Patterns-empty state renders when no patterns", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={[]}
        total_recorded={92}
      />,
    );
    const empty = container.querySelector(
      "[data-patterns-empty]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain("No patterns yet");
  });

  it("Capture CTA + Export CTA fire their handlers", () => {
    const onCapture = vi.fn();
    const onExport = vi.fn();
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
        onCapture={onCapture}
        onExport={onExport}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-capture-cta]") as HTMLButtonElement,
    );
    expect(onCapture).toHaveBeenCalled();
    fireEvent.click(
      container.querySelector("[data-export]") as HTMLButtonElement,
    );
    expect(onExport).toHaveBeenCalled();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <SynchronicityLogSurface
        days={DAYS}
        patterns={PATTERNS}
        total_recorded={92}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
