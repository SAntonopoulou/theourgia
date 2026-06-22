import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { BodyMarker } from "../BodySilhouette/BodySilhouette.js";
import { BodyMarkerLegend } from "./BodyMarkerLegend.js";
import { SensationTypeGrid } from "./SensationTypeGrid.js";

// ─── SensationTypeGrid ────────────────────────────────────────────

describe("SensationTypeGrid", () => {
  it("renders 12 sensation buttons by default", () => {
    const { container } = render(
      <SensationTypeGrid value="warmth" />,
    );
    expect(
      container.querySelectorAll("[data-sensation-type]"),
    ).toHaveLength(12);
  });

  it("marks the active type with aria-checked + data-active", () => {
    const { container } = render(
      <SensationTypeGrid value="pleasure" />,
    );
    const active = container.querySelector('[data-active="true"]');
    expect(active?.getAttribute("data-sensation-type")).toBe("pleasure");
    expect(active?.getAttribute("aria-checked")).toBe("true");
  });

  it("fires onChange with the picked type", () => {
    const onChange = vi.fn();
    render(<SensationTypeGrid value="warmth" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Coolness"));
    expect(onChange).toHaveBeenCalledWith("coolness");
  });

  it("subsets the grid when `types` is provided", () => {
    const { container } = render(
      <SensationTypeGrid
        value="warmth"
        types={["warmth", "coolness", "void"]}
      />,
    );
    expect(
      container.querySelectorAll("[data-sensation-type]"),
    ).toHaveLength(3);
  });

  it("uses caller-provided glyphs when given", () => {
    render(
      <SensationTypeGrid
        value="warmth"
        glyphs={{
          warmth: <span data-testid="warmth-glyph">☀</span>,
        }}
      />,
    );
    expect(screen.getByTestId("warmth-glyph")).toBeInTheDocument();
  });

  it("attaches role=radiogroup + aria-label", () => {
    const { container } = render(<SensationTypeGrid value="warmth" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("role")).toBe("radiogroup");
    expect(root.getAttribute("aria-label")).toBe("Sensation type");
  });
});

// ─── BodyMarkerLegend ─────────────────────────────────────────────

const markers: BodyMarker[] = [
  {
    id: "m1",
    view: "front",
    x: 0.5,
    y: 0.2,
    type: "pressure",
    intensity: 4,
    color: "#8A7BB0",
    notes: "Brow band.",
  },
  {
    id: "m2",
    view: "back",
    x: 0.5,
    y: 0.3,
    type: "coolness",
    intensity: 4,
    color: "#6E9FC0",
  },
  {
    id: "m3",
    view: "palm",
    x: 0.5,
    y: 0.5,
    type: "tingling",
    intensity: 6,
    color: "#6FBFA0",
  },
];

describe("BodyMarkerLegend", () => {
  it("renders one row per marker with the canonical type label", () => {
    const { container } = render(<BodyMarkerLegend markers={markers} />);
    expect(
      container.querySelectorAll("[data-legend-marker-id]"),
    ).toHaveLength(3);
    expect(screen.getByText("Pressure")).toBeInTheDocument();
    expect(screen.getByText("Coolness")).toBeInTheDocument();
    expect(screen.getByText("Tingling")).toBeInTheDocument();
  });

  it("singularises / pluralises the count line", () => {
    const { rerender } = render(
      <BodyMarkerLegend markers={[markers[0]!]} />,
    );
    expect(screen.getByText("1 marking")).toBeInTheDocument();
    rerender(<BodyMarkerLegend markers={markers} />);
    expect(screen.getByText("3 markings")).toBeInTheDocument();
  });

  it("renders the empty state when no markers", () => {
    render(<BodyMarkerLegend markers={[]} />);
    expect(
      screen.getByText(/Nothing marked yet/),
    ).toBeInTheDocument();
    expect(screen.getByText("0 markings")).toBeInTheDocument();
  });

  it("shows the note when present, 'no note' otherwise", () => {
    const { container } = render(<BodyMarkerLegend markers={markers} />);
    const rows = container.querySelectorAll("[data-legend-marker-id]");
    expect(rows[0]?.textContent).toContain("Brow band.");
    expect(rows[0]?.textContent).toContain("intensity 4");
    expect(rows[1]?.textContent).toContain("no note");
  });

  it("truncates notes longer than 34 chars with an ellipsis", () => {
    const longNote =
      "abcdefghijklmnopqrstuvwxyz0123456789-this-extra-is-cut";
    const { container } = render(
      <BodyMarkerLegend
        markers={[{ ...markers[0]!, notes: longNote }]}
      />,
    );
    const row = container.querySelector("[data-legend-marker-id]");
    // notes.slice(0, 34) = "abcdefghijklmnopqrstuvwxyz01234567"
    expect(row?.textContent).toContain(
      "abcdefghijklmnopqrstuvwxyz01234567…",
    );
    expect(row?.textContent).not.toContain("this-extra-is-cut");
  });

  it("renders the view label per marker (with profile suffix for left/right)", () => {
    render(
      <BodyMarkerLegend
        markers={[
          { ...markers[0]!, view: "left" },
          { ...markers[0]!, id: "x2", view: "front" },
        ]}
      />,
    );
    expect(screen.getByText("left profile")).toBeInTheDocument();
    expect(screen.getByText("front")).toBeInTheDocument();
  });

  it("fires onSelect with the marker id when a row is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <BodyMarkerLegend markers={markers} onSelect={onSelect} />,
    );
    fireEvent.click(
      container.querySelector("[data-legend-marker-id='m2']") as HTMLElement,
    );
    expect(onSelect).toHaveBeenCalledWith("m2");
  });

  it("accepts heading + emptyLabel overrides", () => {
    render(
      <BodyMarkerLegend
        markers={[]}
        heading="Tonight"
        emptyLabel="Quiet body."
      />,
    );
    expect(screen.getByText("Tonight")).toBeInTheDocument();
    expect(screen.getByText("Quiet body.")).toBeInTheDocument();
  });
});
