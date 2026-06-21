import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import {
  ALIAS_EDGE_KINDS,
  AliasGraph,
  type EntityAggregate,
} from "./AliasGraph.js";

const hekateAggregate: EntityAggregate = {
  focusId: "hekate",
  nodes: [
    { id: "hekate", name: "Hekate", color: "#C9A24C" },
    { id: "hekate-soteira", name: "Hekate-Soteira", color: "#C9A24C" },
    { id: "hekate-trivia", name: "Hekate-Trivia", color: "#C9A24C" },
  ],
  edges: [
    {
      id: "e1",
      from: "hekate",
      to: "hekate-soteira",
      kind: "aspect-includes",
    },
    { id: "e2", from: "hekate", to: "hekate-trivia", kind: "aspect-includes" },
  ],
};

describe("AliasGraph", () => {
  it("renders a node for the focus and each related entity", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    const nodes = container.querySelectorAll("[data-node-id]");
    expect(nodes).toHaveLength(3);
    expect(container.querySelector('[data-node-role="focus"]')).toHaveAttribute(
      "data-node-id",
      "hekate",
    );
  });

  it("does NOT render a node for entities that are not connected to focus", () => {
    const isolated: EntityAggregate = {
      focusId: "hekate",
      nodes: [
        { id: "hekate", name: "Hekate" },
        { id: "apollon", name: "Apollon" },
      ],
      edges: [],
    };
    const { container } = render(<AliasGraph aggregate={isolated} />);
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(1);
  });

  it("renders one edge label per connected pair", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    const edges = container.querySelectorAll("[data-edge-id]");
    expect(edges).toHaveLength(2);
  });

  it("uses → for asymmetric edge kinds", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    const text = container.textContent ?? "";
    expect(text).toContain("→");
    expect(text).not.toContain("↔");
  });

  it("uses ↔ for symmetric edge kinds", () => {
    const symmetric: EntityAggregate = {
      focusId: "brigid",
      nodes: [
        { id: "brigid", name: "Brigid" },
        { id: "saint-brigid", name: "Saint Brigid" },
      ],
      edges: [
        {
          id: "e1",
          from: "brigid",
          to: "saint-brigid",
          kind: "syncretic-with",
        },
      ],
    };
    const { container } = render(<AliasGraph aggregate={symmetric} />);
    expect(container.textContent ?? "").toContain("↔");
  });

  it("calls onRemoveEdge when an edge label is clicked", () => {
    const onRemoveEdge = vi.fn();
    const { container } = render(
      <AliasGraph
        aggregate={hekateAggregate}
        onRemoveEdge={onRemoveEdge}
      />,
    );
    const edgeLabels = container.querySelectorAll("[data-edge-id] text");
    fireEvent.click(edgeLabels[0]!);
    expect(onRemoveEdge).toHaveBeenCalledWith("e1");
  });

  it("does nothing on edge click when no handler is provided", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    // No handler — should not throw.
    expect(() => {
      const edgeLabels = container.querySelectorAll("[data-edge-id] text");
      fireEvent.click(edgeLabels[0]!);
    }).not.toThrow();
  });

  it("exposes edge-kind metadata with correct symmetry", () => {
    expect(ALIAS_EDGE_KINDS["same-as"].symmetric).toBe(true);
    expect(ALIAS_EDGE_KINDS["syncretic-with"].symmetric).toBe(true);
    expect(ALIAS_EDGE_KINDS["aspect-of"].symmetric).toBe(false);
    expect(ALIAS_EDGE_KINDS["aspect-includes"].symmetric).toBe(false);
    expect(ALIAS_EDGE_KINDS["epithet-of"].symmetric).toBe(false);
  });

  it("attaches structural data attributes for downstream tooling", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    const svg = container.firstElementChild as SVGElement;
    expect(svg.getAttribute("data-component")).toBe("alias-graph");
    expect(svg.getAttribute("data-focus-id")).toBe("hekate");
  });

  it("renders an accessible role + aria-label naming the focus", () => {
    const { container } = render(<AliasGraph aggregate={hekateAggregate} />);
    const svg = container.firstElementChild as SVGElement;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toContain("Hekate");
  });
});
