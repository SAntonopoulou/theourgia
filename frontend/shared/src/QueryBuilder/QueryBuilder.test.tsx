/**
 * QueryBuilderSurface tests (H06 §S7.8).
 *
 * Honesty + H06 rule coverage:
 *   - "Reads as" plain-English banner reflects the current filter set
 *   - Subject change rebinds the axis list
 *   - Comparator dropdown narrows by axis type
 *   - Run button disabled when filters have empty values
 *   - Save modal: Materialise-daily defaults OFF
 *   - Sealed-excluded count surfaces as a quiet stat (count-only)
 *   - Not-run state copy verbatim
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type ExecutedQueryResult,
  type QBAxis,
  QueryBuilderSurface,
} from "./index.js";

const AXES: QBAxis[] = [
  {
    field: "entry.entry_type",
    label: "Type",
    subjects: ["entry"],
    type: "string",
  },
  {
    field: "entry.body_text",
    label: "Body text",
    subjects: ["entry"],
    type: "string",
  },
  {
    field: "synchronicity.intensity",
    label: "Intensity",
    subjects: ["synchronicity"],
    type: "int",
  },
  {
    field: "synchronicity.category",
    label: "Category",
    subjects: ["synchronicity"],
    type: "string",
  },
];

const SAMPLE_RESULT: ExecutedQueryResult = {
  total_rows: 12,
  sealed_excluded_count: 3,
  rows: [
    {
      id: "r1",
      date_label: "26 Jun 2026",
      title: "Dark moon offering",
      meta: "outcome 8 · waning",
      rating_label: "8.1",
    },
    {
      id: "r2",
      date_label: "24 Jun 2026",
      title: "Banishing rite",
      meta: "outcome 7",
      rating_label: "7.3",
    },
  ],
};

describe("QueryBuilderSurface", () => {
  it("renders the title + subject select + Run CTA", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    expect(container.textContent).toContain("Query Builder");
    expect(container.querySelector("[data-subject-select]")).toBeTruthy();
    expect(container.querySelector("[data-run]")).toBeTruthy();
  });

  it("not-run state copy is verbatim", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    const block = container.querySelector("[data-not-run]") as HTMLElement;
    expect(block).toBeTruthy();
    expect(block.textContent).toContain(
      "Build a filter on the left, then Run.",
    );
  });

  it("'Reads as' banner reflects an empty filter set in plain English", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    const banner = container.querySelector(
      "[data-reads-as]",
    ) as HTMLElement;
    expect(banner.textContent).toContain("Every entry in your vault");
  });

  it("Add filter + value updates produce DSL-shaped payload on Run", () => {
    const onRun = vi.fn();
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={onRun}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    // The first row should have appeared.
    const rows = container.querySelectorAll("[data-filter-row]");
    expect(rows).toHaveLength(1);
    // Set a value so Run becomes enabled.
    const valueInput = rows[0]?.querySelector(
      "[data-filter-value]",
    ) as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: "working" } });
    fireEvent.click(
      container.querySelector("[data-run]") as HTMLButtonElement,
    );
    expect(onRun).toHaveBeenCalledWith({
      subject: "entry",
      filters: [
        expect.objectContaining({ field: "entry.entry_type", value: "working" }),
      ],
    });
  });

  it("Switching subject re-binds the axis dropdown to the new subject's axes", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-subject-select]") as HTMLSelectElement,
      { target: { value: "synchronicity" } },
    );
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    const axisSelect = container.querySelector(
      "[data-filter-axis]",
    ) as HTMLSelectElement;
    const options = Array.from(axisSelect.options).map((o) => o.value);
    expect(options).toContain("synchronicity.intensity");
    expect(options).toContain("synchronicity.category");
    expect(options).not.toContain("entry.entry_type");
  });

  it("Comparator dropdown narrows by axis type", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        initial_subject="synchronicity"
        result={null}
        onRun={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    // The default first axis for synchronicity is "intensity" (int).
    // Int axes should expose lt/le/gt/ge/between but NOT contains/matches.
    const cmpSelect = container.querySelector(
      "[data-filter-cmp]",
    ) as HTMLSelectElement;
    const options = Array.from(cmpSelect.options).map((o) => o.value);
    expect(options).toContain("lt");
    expect(options).toContain("ge");
    expect(options).toContain("between");
    expect(options).not.toContain("contains");
    expect(options).not.toContain("matches");
  });

  it("Run disabled when a filter has an empty value", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    const run = container.querySelector("[data-run]") as HTMLButtonElement;
    // No filters yet — Run is disabled.
    expect(run.disabled).toBe(true);
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    // Filter with empty value — Run still disabled.
    expect(run.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-filter-value]") as HTMLInputElement,
      { target: { value: "working" } },
    );
    expect(run.disabled).toBe(false);
  });

  it("Remove filter row removes it from the list", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={null}
        onRun={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    expect(container.querySelectorAll("[data-filter-row]")).toHaveLength(1);
    fireEvent.click(
      container.querySelector(
        "button[data-filter-remove]",
      ) as HTMLButtonElement,
    );
    expect(container.querySelectorAll("[data-filter-row]")).toHaveLength(0);
  });

  it("Results render with date + title + rating chips", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
      />,
    );
    expect(
      container.querySelectorAll("[data-result-row]"),
    ).toHaveLength(2);
    expect(container.textContent).toContain("Dark moon offering");
    expect(container.textContent).toContain("8.1");
  });

  it("Sealed-excluded count surfaces as a quiet stat (count only)", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
      />,
    );
    const sealed = container.querySelector(
      "[data-sealed-stat]",
    ) as HTMLElement;
    expect(sealed).toBeTruthy();
    expect(sealed.textContent).toContain("3 sealed");
    expect(sealed.style.color).toBe("var(--ink-mute)");
  });

  it("Sealed-excluded stat hidden when count is 0", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={{ ...SAMPLE_RESULT, sealed_excluded_count: 0 }}
        onRun={() => {}}
      />,
    );
    expect(container.querySelector("[data-sealed-stat]")).toBeFalsy();
  });

  it("Save modal opens; Materialise-daily defaults OFF", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-save-as-study]") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-save-modal]")).toBeTruthy();
    const checkbox = container.querySelector(
      "[data-materialise-toggle] input[type='checkbox']",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("Save confirm fires onSave with the assembled payload", () => {
    const onSave = vi.fn();
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
        onSave={onSave}
      />,
    );
    // Add a filter so the run-state matters for the save.
    fireEvent.click(
      container.querySelector("[data-add-filter]") as HTMLButtonElement,
    );
    fireEvent.change(
      container.querySelector("[data-filter-value]") as HTMLInputElement,
      { target: { value: "working" } },
    );
    fireEvent.click(
      container.querySelector("[data-save-as-study]") as HTMLButtonElement,
    );
    fireEvent.change(
      container.querySelector("[data-save-name]") as HTMLInputElement,
      { target: { value: "Test query" } },
    );
    fireEvent.click(
      container.querySelector("[data-save-confirm]") as HTMLButtonElement,
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test query",
        materialise_daily: false,
        subject: "entry",
      }),
    );
  });

  it("Save Confirm disabled until Name has text", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-save-as-study]") as HTMLButtonElement,
    );
    const confirm = container.querySelector(
      "[data-save-confirm]",
    ) as HTMLButtonElement;
    fireEvent.change(
      container.querySelector("[data-save-name]") as HTMLInputElement,
      { target: { value: "" } },
    );
    expect(confirm.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-save-name]") as HTMLInputElement,
      { target: { value: "x" } },
    );
    expect(confirm.disabled).toBe(false);
  });

  it("CSV CTA fires onExportCsv", () => {
    const onExportCsv = vi.fn();
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
        onExportCsv={onExportCsv}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-export-csv]") as HTMLButtonElement,
    );
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("Open-result fires onOpenResult with the row id", () => {
    const onOpenResult = vi.fn();
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
        onOpenResult={onOpenResult}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-result-row='r1']") as HTMLElement,
    );
    expect(onOpenResult).toHaveBeenCalledWith("r1");
  });

  it("Empty results state copy is friendly", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={{ total_rows: 0, sealed_excluded_count: 0, rows: [] }}
        onRun={() => {}}
      />,
    );
    const noMatch = container.querySelector("[data-no-match]") as HTMLElement;
    expect(noMatch).toBeTruthy();
    expect(noMatch.textContent).toContain("Nothing matched");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <QueryBuilderSurface
        axes={AXES}
        result={SAMPLE_RESULT}
        onRun={() => {}}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
