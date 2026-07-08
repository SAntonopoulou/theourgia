import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { FamilyTreeSurface } from "./FamilyTreeSurface.js";
import {
  type FamilyTreeInput,
  layoutFamilyTree,
} from "./layout.js";

const threeGenerations: FamilyTreeInput = {
  probe_id: "probe",
  nodes: [
    { id: "probe", name: "Probe", kind: "beloved_dead", generation: 0 },
    { id: "mother", name: "Mother", kind: "ancestor", generation: -1 },
    { id: "father", name: "Father", kind: "ancestor", generation: -1 },
    { id: "grandma", name: "Grandma", kind: "ancestor", generation: -2 },
    { id: "child", name: "Child", kind: "beloved_dead", generation: 1 },
    { id: "sib", name: "Sibling", kind: "beloved_dead", generation: 0 },
  ],
  edges: [
    { id: "e1", source_entity_id: "mother", target_entity_id: "probe", kind: "parent-of" },
    { id: "e2", source_entity_id: "father", target_entity_id: "probe", kind: "parent-of" },
    { id: "e3", source_entity_id: "grandma", target_entity_id: "mother", kind: "parent-of" },
    { id: "e4", source_entity_id: "probe", target_entity_id: "child", kind: "parent-of" },
    { id: "e5", source_entity_id: "probe", target_entity_id: "sib", kind: "sibling-of" },
  ],
};

describe("layoutFamilyTree", () => {
  it("groups nodes into generational rows", () => {
    const out = layoutFamilyTree(threeGenerations);
    const rowYs = new Set(out.nodes.map((n) => n.y));
    // -2, -1, 0, +1  → four distinct Y rows
    expect(rowYs.size).toBe(4);
  });

  it("centres the probe row on the surface width", () => {
    const out = layoutFamilyTree(threeGenerations);
    const probe = out.nodes.find((n) => n.id === "probe")!;
    const sib = out.nodes.find((n) => n.id === "sib")!;
    // probe and sibling both live on generation 0
    expect(probe.y).toBe(sib.y);
    // combined row should be centered → their midpoint ≈ width/2
    const midX = (probe.x + sib.x) / 2;
    expect(Math.abs(midX - out.width / 2)).toBeLessThan(0.5);
  });

  it("skips edges that reference unknown node ids", () => {
    const dangling: FamilyTreeInput = {
      probe_id: "a",
      nodes: [{ id: "a", name: "A", kind: "ancestor", generation: 0 }],
      edges: [
        { id: "x", source_entity_id: "a", target_entity_id: "ghost", kind: "parent-of" },
      ],
    };
    const out = layoutFamilyTree(dangling);
    expect(out.edges).toHaveLength(0);
  });

  it("handles the trivial one-node tree", () => {
    const solo: FamilyTreeInput = {
      probe_id: "a",
      nodes: [{ id: "a", name: "A", kind: "ancestor", generation: 0 }],
      edges: [],
    };
    const out = layoutFamilyTree(solo);
    expect(out.nodes).toHaveLength(1);
    expect(out.probeX).toBeGreaterThan(0);
  });
});

describe("FamilyTreeSurface", () => {
  it("renders a node group for every entity in the tree", () => {
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} />,
    );
    const nodes = container.querySelectorAll("[data-node-id]");
    expect(nodes).toHaveLength(threeGenerations.nodes.length);
  });

  it("marks the probe node with data-node-role=probe", () => {
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} />,
    );
    const probes = container.querySelectorAll('[data-node-role="probe"]');
    expect(probes).toHaveLength(1);
    expect(probes[0]).toHaveAttribute("data-node-id", "probe");
  });

  it("draws one edge line per input edge", () => {
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} />,
    );
    const edges = container.querySelectorAll("[data-edge-id]");
    expect(edges).toHaveLength(threeGenerations.edges.length);
  });

  it("fires onSelectNode when a non-probe node is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} onSelectNode={onSelect} />,
    );
    const kin = container.querySelector('[data-node-id="mother"]')!;
    fireEvent.click(kin);
    expect(onSelect).toHaveBeenCalledWith("mother");
  });

  it("does NOT fire onSelectNode for the probe itself", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} onSelectNode={onSelect} />,
    );
    const probe = container.querySelector('[data-node-role="probe"]')!;
    fireEvent.click(probe);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("fires onRemoveEdge when an edge label is clicked", () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FamilyTreeSurface tree={threeGenerations} onRemoveEdge={onRemove} />,
    );
    const label = container.querySelector('[data-edge-id="e1"] text')!;
    fireEvent.click(label);
    expect(onRemove).toHaveBeenCalledWith("e1");
  });

  it("renders lived-dates when the ancestor_profile carries them", () => {
    const withDates: FamilyTreeInput = {
      probe_id: "a",
      nodes: [
        {
          id: "a",
          name: "A",
          kind: "ancestor",
          generation: 0,
          ancestor_profile: {
            dates_lived_from: "1892",
            dates_lived_until: "1971",
          },
        },
      ],
      edges: [],
    };
    const { container } = render(<FamilyTreeSurface tree={withDates} />);
    expect(container.textContent).toContain("1892");
    expect(container.textContent).toContain("1971");
  });
});
