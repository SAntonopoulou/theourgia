import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  FUNCTION_GROUPS,
  KIND_LABEL,
  KindFunctionFilter,
  type KindFunctionFilterCounts,
  type KindFunctionFilterValue,
} from "./KindFunctionFilter.js";

const sampleCounts: KindFunctionFilterCounts = {
  total: 10,
  perKind: {
    deity: 2,
    goddess: 1,
    spirit: 1,
    ancestor: 1,
    beloved_dead: 1,
    servitor: 1,
    place: 1,
    other: 2,
  },
  perTradition: { Hellenic: 4, Personal: 3, Constructed: 1, Gaelic: 2 },
};

const allValue: KindFunctionFilterValue = {
  kind: "all",
  status: "all",
  tradition: "all",
};

function renderFilter(
  overrides: Partial<{
    value: KindFunctionFilterValue;
    onChange: (next: KindFunctionFilterValue) => void;
    showSevered: boolean;
    onToggleSevered: (next: boolean) => void;
    traditions: string[];
  }> = {},
) {
  const onChange = overrides.onChange ?? vi.fn();
  const onToggleSevered = overrides.onToggleSevered ?? vi.fn();
  const utils = render(
    <KindFunctionFilter
      counts={sampleCounts}
      value={overrides.value ?? allValue}
      onChange={onChange}
      showSevered={overrides.showSevered ?? false}
      onToggleSevered={onToggleSevered}
      traditions={overrides.traditions ?? ["Hellenic", "Gaelic", "Personal"]}
    />,
  );
  return { onChange, onToggleSevered, ...utils };
}

describe("KindFunctionFilter", () => {
  it("renders all five function groups", () => {
    renderFilter();
    // Use getAllByText for "Other" — it collides with the kind sublabel.
    expect(screen.getByText("Venerated")).toBeInTheDocument();
    expect(screen.getByText("Approached")).toBeInTheDocument();
    expect(screen.getByText("Intimate")).toBeInTheDocument();
    expect(screen.getByText("Constructed")).toBeInTheDocument();
    expect(screen.getAllByText("Other").length).toBeGreaterThanOrEqual(1);
    // Sanity-check that all five group keys exist in the meta map.
    expect(Object.keys(FUNCTION_GROUPS)).toHaveLength(5);
  });

  it("renders only kinds with counts > 0 as sub-buttons", () => {
    renderFilter();
    // deity, goddess have counts; god (0) does not
    expect(screen.getByText(KIND_LABEL.deity)).toBeInTheDocument();
    expect(screen.getByText(KIND_LABEL.goddess)).toBeInTheDocument();
    expect(screen.queryByText(KIND_LABEL.god)).toBeNull();
  });

  it("calls onChange with a function-group key when one is clicked", () => {
    const { onChange } = renderFilter();
    fireEvent.click(screen.getByText("Venerated"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "venerated" }),
    );
  });

  it("calls onChange with a specific kind when a sub-button is clicked", () => {
    const { onChange } = renderFilter();
    fireEvent.click(screen.getByText(KIND_LABEL.deity));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "deity" }),
    );
  });

  it("toggles status off when the same status is selected twice", () => {
    const { onChange } = renderFilter({
      value: { ...allValue, status: "active" },
    });
    fireEvent.click(screen.getByText("Active"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "all" }),
    );
  });

  it("does NOT show the 'severed' status pill in the filter row", () => {
    renderFilter();
    // The pill row excludes severed; severed is governed by the switch.
    const statusButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent === "Severed");
    expect(statusButtons).toHaveLength(0);
  });

  it("renders the 'Show severed' toggle as a switch", () => {
    renderFilter();
    const sw = screen.getByRole("switch", { name: /show severed/i });
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("flips the severed switch when clicked", () => {
    const { onToggleSevered } = renderFilter();
    fireEvent.click(screen.getByRole("switch", { name: /show severed/i }));
    expect(onToggleSevered).toHaveBeenCalledWith(true);
  });

  it("renders the total count next to 'All beings'", () => {
    renderFilter();
    const allBtn = screen.getByText("All beings").closest("button");
    expect(allBtn?.textContent).toContain("10");
  });

  it("toggles tradition when clicked twice", () => {
    const { onChange } = renderFilter({
      value: { ...allValue, tradition: "Hellenic" },
    });
    fireEvent.click(screen.getByText("Hellenic"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tradition: "all" }),
    );
  });

  it("sets aria-pressed on the active kind", () => {
    renderFilter({ value: { ...allValue, kind: "intimate" } });
    const btn = screen.getByText("Intimate").closest("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("attaches a structural data-component attribute", () => {
    const { container } = renderFilter();
    expect(container.firstElementChild).toHaveAttribute(
      "data-component",
      "kind-function-filter",
    );
  });
});
