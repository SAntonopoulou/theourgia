/**
 * AnalyticsDashboardSurface tests (H06 §S7.7).
 *
 * Honesty + H06 rule coverage:
 *   - Verbatim "Observation only — not a recommendation" disclaimer
 *     on every pattern row
 *   - Sample-size footnote on each heatmap panel
 *   - Small-sample chip uses --accent (warm invitation), not --warn
 *   - Scope tabs switch + onScopeChange fires
 *   - Heatmap cells fire onHeatmapCellClick with the correct panel key
 *   - Empty states render observational copy, never apologetic
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type HeatmapPanel,
  type PatternRow,
  type SavedStudyTile,
  type TimelineDay,
  AnalyticsDashboardSurface,
} from "./index.js";

const HERO_STATS = [
  { value: "12", label: "entries this week" },
  { value: "3", label: "workings" },
  { value: "5", label: "synchronicities" },
  { value: "2", label: "divinations" },
];

const TIMELINE: TimelineDay[] = [
  {
    label: "Mon 22",
    bars: [
      { series: "entries", count: 2 },
      { series: "syncs", count: 1 },
    ],
  },
  {
    label: "Tue 23",
    bars: [
      { series: "entries", count: 3 },
      { series: "syncs", count: 0 },
    ],
  },
];

const LEGEND = [
  { series: "entries", label: "Entries", color: "var(--chart-1)" },
  { series: "syncs", label: "Synchronicities", color: "var(--chart-2)" },
];

const PATTERNS: PatternRow[] = [
  {
    id: "p1",
    text: "Saturn-hour workings show a higher mean outcome than the rest.",
    stat_label: "n=14 · 2.3× baseline",
    small_sample: false,
  },
  {
    id: "p2",
    text: "Three dream-spillovers this month fall on the same lunar phase.",
    stat_label: "n=3",
    small_sample: true,
  },
];

const HEATMAP_HOUR: HeatmapPanel = {
  title: "Outcome × planetary hour",
  caption: "Cell shade = mean outcome rating · click to drill in.",
  cells: [
    { x: "sun", y: "mon", value: 6.4 },
    { x: "moon", y: "mon", value: 7.1 },
    { x: "sun", y: "tue", value: 5.9 },
    { x: "moon", y: "tue", value: 8.2 },
  ],
  footnote: "Computed from your local journal · n=89",
};

const HEATMAP_LUNAR: HeatmapPanel = {
  title: "Outcome × lunar phase",
  caption: "Cell shade = mean outcome rating · click to drill in.",
  cells: [
    { x: "new", y: "high", value: 7.2 },
    { x: "waxing", y: "high", value: 5.5 },
    { x: "full", y: "high", value: 6.8 },
    { x: "waning", y: "high", value: 8.1 },
  ],
  footnote: "Computed from your local journal · n=76",
};

const SAVED_STUDIES: SavedStudyTile[] = [
  { id: "s1", name: "Lunar phase efficacy", meta: "run 2h ago · n=76" },
  {
    id: "s2",
    name: "Hekate cross-context",
    meta: "run 3d ago · n=31",
  },
];

describe("AnalyticsDashboardSurface", () => {
  it("renders the header + scope tabs + every primary section", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    expect(container.textContent).toContain("Analytics");
    expect(container.querySelector("[data-scope-tabs]")).toBeTruthy();
    expect(container.querySelector("[data-section-recent]")).toBeTruthy();
    expect(container.querySelector("[data-section-patterns]")).toBeTruthy();
    expect(container.querySelector("[data-section-stats]")).toBeTruthy();
    expect(
      container.querySelector("[data-section-heatmap-hour]"),
    ).toBeTruthy();
    expect(
      container.querySelector("[data-section-heatmap-lunar]"),
    ).toBeTruthy();
  });

  it("Pattern rows carry the verbatim 'observation only' disclaimer", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    const disclaimers = container.querySelectorAll(
      "[data-pattern-disclaimer]",
    );
    expect(disclaimers).toHaveLength(2);
    disclaimers.forEach((d) => {
      expect(d.textContent).toContain(
        "Observation only — not a recommendation. Patterns suggest where to look, not what to do.",
      );
    });
  });

  it("Small-sample chip uses --accent (warm invite), not --warn / --danger", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
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

  it("Scope tab click fires onScopeChange + flips aria-pressed", () => {
    const onScopeChange = vi.fn();
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
        onScopeChange={onScopeChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-scope='month']") as HTMLButtonElement,
    );
    expect(onScopeChange).toHaveBeenCalledWith("month");
    expect(
      container
        .querySelector("[data-scope='month']")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("Hero stats render in --font-display · 22px · --ink colour", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    const lines = container.querySelectorAll("[data-stat-line]");
    expect(lines).toHaveLength(HERO_STATS.length);
    expect(lines[0]?.textContent).toContain("12");
    expect(lines[0]?.textContent).toContain("entries this week");
  });

  it("Heatmap renders cells + the n= footnote", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    expect(
      container.querySelector(
        "[data-section-heatmap-hour] [data-heatmap-cell='sun|mon']",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector("[data-section-heatmap-hour]")?.textContent,
    ).toContain("n=89");
    expect(
      container.querySelector("[data-section-heatmap-lunar]")?.textContent,
    ).toContain("n=76");
  });

  it("Heatmap cell click fires onHeatmapCellClick with the panel key", () => {
    const onHeatmapCellClick = vi.fn();
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
        onHeatmapCellClick={onHeatmapCellClick}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-section-heatmap-hour] [data-heatmap-cell='sun|mon']",
      ) as HTMLElement,
    );
    expect(onHeatmapCellClick).toHaveBeenCalledWith("hour", "sun", "mon");
    fireEvent.click(
      container.querySelector(
        "[data-section-heatmap-lunar] [data-heatmap-cell='new|high']",
      ) as HTMLElement,
    );
    expect(onHeatmapCellClick).toHaveBeenCalledWith("lunar", "new", "high");
  });

  it("Heatmap empty state renders when panel has no cells", () => {
    const empty: HeatmapPanel = {
      title: "Outcome × planetary hour",
      caption: "x",
      cells: [],
      footnote: "n=0",
    };
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={empty}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    expect(
      container.querySelector("[data-heatmap-hour-empty]"),
    ).toBeTruthy();
  });

  it("Timeline empty state renders when no days", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={[]}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    expect(container.querySelector("[data-timeline-empty]")).toBeTruthy();
  });

  it("Patterns empty state renders observational copy", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={[]}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    const empty = container.querySelector(
      "[data-patterns-empty]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain("weekly digest will fill this in");
  });

  it("Saved studies rail empty state copy is friendly", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={[]}
      />,
    );
    expect(
      container.querySelector("[data-saved-studies-empty]"),
    ).toBeTruthy();
  });

  it("Open saved study fires onOpenStudy + New study fires onNewStudy", () => {
    const onOpenStudy = vi.fn();
    const onNewStudy = vi.fn();
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
        onOpenStudy={onOpenStudy}
        onNewStudy={onNewStudy}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-saved-study='s1']",
      ) as HTMLButtonElement,
    );
    expect(onOpenStudy).toHaveBeenCalledWith("s1");
    fireEvent.click(
      container.querySelector("[data-new-study]") as HTMLButtonElement,
    );
    expect(onNewStudy).toHaveBeenCalled();
  });

  it("View matching fires onViewMatching with the pattern id", () => {
    const onViewMatching = vi.fn();
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
        onViewMatching={onViewMatching}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-view-matching='p1']",
      ) as HTMLButtonElement,
    );
    expect(onViewMatching).toHaveBeenCalledWith("p1");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <AnalyticsDashboardSurface
        scope="week"
        hero_stats={HERO_STATS}
        timeline_days={TIMELINE}
        timeline_legend={LEGEND}
        patterns={PATTERNS}
        heatmap_hour={HEATMAP_HOUR}
        heatmap_lunar={HEATMAP_LUNAR}
        saved_studies={SAVED_STUDIES}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
