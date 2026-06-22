import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ALIAS_EDGE_KINDS,
  AliasGraph,
  type EntityAggregate,
} from "./AliasGraph.js";
import {
  EDGE_KIND_ORDER_DEFAULT,
  EdgeKindLegend,
} from "./EdgeKindLegend.js";

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

// ─── EdgeKindLegend ───────────────────────────────────────────────

describe("EdgeKindLegend", () => {
  it("renders one row per default edge kind", () => {
    const { container } = render(<EdgeKindLegend />);
    expect(container.querySelectorAll("[data-edge-kind]")).toHaveLength(
      EDGE_KIND_ORDER_DEFAULT.length,
    );
  });

  it("labels every kind from ALIAS_EDGE_KINDS metadata", () => {
    render(<EdgeKindLegend />);
    EDGE_KIND_ORDER_DEFAULT.forEach((kind) => {
      expect(
        screen.getByText(ALIAS_EDGE_KINDS[kind].label),
      ).toBeInTheDocument();
    });
  });

  it("uses → for asymmetric kinds and ↔ for symmetric kinds", () => {
    const { container } = render(<EdgeKindLegend />);
    const sameAs = container.querySelector('[data-edge-kind="same-as"]');
    const aspectOf = container.querySelector('[data-edge-kind="aspect-of"]');
    expect(sameAs?.querySelector("[data-edge-arrow]")?.textContent).toBe("↔");
    expect(aspectOf?.querySelector("[data-edge-arrow]")?.textContent).toBe("→");
  });

  it("respects a custom subset + order via the kinds prop", () => {
    const { container } = render(
      <EdgeKindLegend kinds={["syncretic-with", "epithet-of"]} />,
    );
    const rows = container.querySelectorAll("[data-edge-kind]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("data-edge-kind")).toBe("syncretic-with");
    expect(rows[1]?.getAttribute("data-edge-kind")).toBe("epithet-of");
  });

  it("renders the description verbatim from metadata", () => {
    render(<EdgeKindLegend kinds={["same-as"]} />);
    expect(
      screen.getByText(ALIAS_EDGE_KINDS["same-as"].description),
    ).toBeInTheDocument();
  });

  it("attaches data-component for downstream tooling", () => {
    const { container } = render(<EdgeKindLegend />);
    expect(
      container.firstElementChild?.getAttribute("data-component"),
    ).toBe("edge-kind-legend");
  });
});
