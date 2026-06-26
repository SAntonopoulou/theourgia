/**
 * PerStudyPageSurface tests (H06 §S7.3).
 *
 * Honesty + H06 rule coverage:
 *   - "This creates a new chart snapshot — the current one is kept."
 *     verbatim under Refresh.
 *   - "Auto-saved · the interpretation is yours; pattern detections
 *     are never written here for you." verbatim under interpretation.
 *   - Kind-aware chart rendering (gematria_search / gematria_calculation)
 *   - Collapsible table toggles
 *   - Refresh button calls onRefresh + disables while refreshing
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PerStudyRecord,
  PerStudyPageSurface,
} from "./index.js";

const SEARCH_RECORD: PerStudyRecord = {
  id: "study-1234",
  name: "Lunar phase efficacy",
  description:
    "Does the Moon's phase at the hour a working begins track with how it turns out?",
  kind: "gematria_search",
  last_run_label: "Last run 22 Jun 2026",
  snapshot_results: {
    total_matches: 5,
    entries_with_matches: 3,
    sealed_match_count: 0,
    results: [
      { phrase: "σοφια", value: 418, cipher_name: "Isopsephy" },
      { phrase: "σοφια", value: 418, cipher_name: "Isopsephy" },
      { phrase: "σοφια", value: 418, cipher_name: "Mispar Hechrachi" },
      { phrase: "alpha", value: 12, cipher_name: "Eng-Simple" },
    ],
    resonances: [],
  },
  sample_size: 4,
  linked_workings: [
    {
      id: "w1",
      title: "Banishing rite",
      date_label: "22 Jun",
      meta: "waning",
      rating_label: "8.1",
    },
  ],
  interpretation: "The waning phases carry my highest mean rating.",
};

const CALC_RECORD: PerStudyRecord = {
  id: "study-5678",
  name: "Gematria of Brimo",
  description: "Value of Brimo under each cipher.",
  kind: "gematria_calculation",
  last_run_label: "Last run 24 Jun 2026",
  snapshot_results: {
    input: "Brimo",
    normalised: "brimo",
    per_cipher: [
      { cipher_id: "c1", cipher_name: "Iso", value: 458, digit_sum: 8 },
      { cipher_id: "c2", cipher_name: "ALW", value: 102, digit_sum: 3 },
    ],
  },
  sample_size: 2,
  linked_workings: [],
  interpretation: "",
};

describe("PerStudyPageSurface", () => {
  it("renders the breadcrumb + title + subtitle + metadata", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    expect(container.textContent).toContain("Studies");
    expect(container.textContent).toContain("Lunar phase efficacy");
    expect(container.textContent).toContain("Does the Moon's phase");
    expect(container.textContent).toContain("Last run 22 Jun 2026");
    expect(container.textContent).toContain("n=4");
  });

  it("renders a bar chart with data for gematria_search", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    const bars = container.querySelectorAll("[data-bar]");
    expect(bars.length).toBeGreaterThan(0);
    // Isopsephy should be the top bar (2 results).
    const labels = Array.from(bars).map((b) => b.getAttribute("data-bar"));
    expect(labels).toContain("Isopsephy");
    expect(labels).toContain("Mispar Hechrachi");
  });

  it("renders the per-cipher breakdown for gematria_calculation", () => {
    const { container } = render(
      <PerStudyPageSurface record={CALC_RECORD} />,
    );
    const bars = container.querySelectorAll("[data-bar]");
    const labels = Array.from(bars).map((b) => b.getAttribute("data-bar"));
    expect(labels).toEqual(["Iso", "ALW"]);
  });

  it("chart empty state when no snapshot", () => {
    const { container } = render(
      <PerStudyPageSurface
        record={{ ...SEARCH_RECORD, snapshot_results: null }}
      />,
    );
    const empty = container.querySelector(
      "[data-chart-empty]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain(
      "No snapshot yet — refresh on the right to run this study.",
    );
  });

  it("interpretation textarea reflects record value + fires onChange", () => {
    const onInterpretationChange = vi.fn();
    const { container } = render(
      <PerStudyPageSurface
        record={SEARCH_RECORD}
        onInterpretationChange={onInterpretationChange}
      />,
    );
    const ta = container.querySelector(
      "[data-interpretation]",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe(SEARCH_RECORD.interpretation);
    fireEvent.change(ta, {
      target: { value: "New interpretation text" },
    });
    expect(onInterpretationChange).toHaveBeenCalledWith(
      "New interpretation text",
    );
  });

  it("Auto-save note copy is verbatim (no pattern-detection auto-write)", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    const note = container.querySelector(
      "[data-autosave-note]",
    ) as HTMLElement;
    expect(note.textContent).toContain(
      "Auto-saved · the interpretation is yours; pattern detections are never written here for you.",
    );
  });

  it("Refresh-chart note copy is verbatim (snapshots preserved)", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    const note = container.querySelector(
      "[data-refresh-note]",
    ) as HTMLElement;
    expect(note.textContent).toContain(
      "This creates a new chart snapshot — the current one is kept.",
    );
  });

  it("Refresh button calls onRefresh", () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PerStudyPageSurface
        record={SEARCH_RECORD}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-refresh-chart]") as HTMLButtonElement,
    );
    expect(onRefresh).toHaveBeenCalled();
  });

  it("Refresh button disabled while refreshing + shows 'Refreshing…'", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} refreshing />,
    );
    const btn = container.querySelector(
      "[data-refresh-chart]",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain("Refreshing");
  });

  it("Edit + Insert into draft CTAs fire their handlers", () => {
    const onEditQuery = vi.fn();
    const onInsertIntoDraft = vi.fn();
    const { container } = render(
      <PerStudyPageSurface
        record={SEARCH_RECORD}
        onEditQuery={onEditQuery}
        onInsertIntoDraft={onInsertIntoDraft}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-edit-query]") as HTMLButtonElement,
    );
    expect(onEditQuery).toHaveBeenCalled();
    fireEvent.click(
      container.querySelector("[data-insert-draft]") as HTMLButtonElement,
    );
    expect(onInsertIntoDraft).toHaveBeenCalled();
  });

  it("Back link fires onBack", () => {
    const onBack = vi.fn();
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} onBack={onBack} />,
    );
    fireEvent.click(container.querySelector("[data-back]") as HTMLElement);
    expect(onBack).toHaveBeenCalled();
  });

  it("Collapsible data table toggles open + shows rows from the chart", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    expect(container.querySelector("[data-data-table]")).toBeFalsy();
    fireEvent.click(
      container.querySelector("[data-table-toggle]") as HTMLButtonElement,
    );
    const table = container.querySelector("[data-data-table]") as HTMLElement;
    expect(table).toBeTruthy();
    expect(table.querySelectorAll("[data-data-row]").length).toBeGreaterThan(
      0,
    );
    // Re-toggle closes
    fireEvent.click(
      container.querySelector("[data-table-toggle]") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-data-table]")).toBeFalsy();
  });

  it("Linked workings render with date + title + rating", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    const workings = container.querySelectorAll("[data-linked-working]");
    expect(workings).toHaveLength(1);
    expect(workings[0]?.textContent).toContain("22 Jun");
    expect(workings[0]?.textContent).toContain("Banishing rite");
    expect(workings[0]?.textContent).toContain("8.1");
  });

  it("Linked workings section hidden when empty", () => {
    const { container } = render(
      <PerStudyPageSurface record={CALC_RECORD} />,
    );
    expect(container.querySelector("[data-linked-workings]")).toBeFalsy();
  });

  it("'Not yet run' label when last_run_label is null", () => {
    const { container } = render(
      <PerStudyPageSurface
        record={{
          ...SEARCH_RECORD,
          last_run_label: null,
          snapshot_results: null,
        }}
      />,
    );
    expect(container.textContent).toContain("Not yet run");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <PerStudyPageSurface record={SEARCH_RECORD} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
