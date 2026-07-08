import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import {
  PilgrimageRoutesSurface,
  type PilgrimageRouteDetail,
  type StopCoord,
} from "./PilgrimageRoutesSurface.js";

const catalog: StopCoord[] = [
  { site_id: "eleusis", name: "Eleusis", x_norm: 0.2, y_norm: 0.4 },
  { site_id: "delphi", name: "Delphi", x_norm: 0.5, y_norm: 0.3 },
  { site_id: "olympia", name: "Olympia", x_norm: 0.3, y_norm: 0.7 },
  { site_id: "athens", name: "Athens", x_norm: 0.6, y_norm: 0.5 },
];

const routes = [
  {
    id: "r1",
    name: "Attica",
    description: null,
    visibility: "personal",
  },
];

const activeRoute: PilgrimageRouteDetail = {
  id: "r1",
  name: "Attica",
  description: null,
  visibility: "personal",
  stops: [
    { id: "s1", site_id: "eleusis", order_index: 0, notes: null },
    { id: "s2", site_id: "delphi", order_index: 1, notes: null },
    { id: "s3", site_id: "olympia", order_index: 2, notes: null },
  ],
};

describe("PilgrimageRoutesSurface", () => {
  it("renders one entry per route", () => {
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={null}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={vi.fn()}
      />,
    );
    const items = container.querySelectorAll(
      '[data-role="route-list"] ul button',
    );
    expect(items).toHaveLength(routes.length);
  });

  it("draws a polyline connecting each stop", () => {
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={vi.fn()}
      />,
    );
    const polyline = container.querySelector(
      '[data-role="route-canvas"] polyline',
    );
    expect(polyline).not.toBeNull();
    // 3 stops → polyline has 3 points
    const points = polyline?.getAttribute("points") ?? "";
    expect(points.split(" ").filter(Boolean)).toHaveLength(3);
  });

  it("renders one numbered circle per stop", () => {
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={vi.fn()}
      />,
    );
    const stops = container.querySelectorAll(
      '[data-role="route-canvas"] g[data-stop-id]',
    );
    expect(stops).toHaveLength(activeRoute.stops.length);
  });

  it("Add-stop dropdown excludes sites already in the route", () => {
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={vi.fn()}
      />,
    );
    const options = container.querySelectorAll(
      '[data-role="stop-editor"] select option',
    );
    // 4 sites - 3 already in route = 1 available + 1 placeholder
    expect(options).toHaveLength(2);
    const values = Array.from(options)
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);
    expect(values).toEqual(["athens"]);
  });

  it("Move-down reorders via onReorderStops", () => {
    const onReorderStops = vi.fn();
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={onReorderStops}
      />,
    );
    const moveDown = Array.from(
      container.querySelectorAll(
        '[data-role="stop-editor"] button[aria-label="Move down"]',
      ),
    )[0] as HTMLButtonElement;
    fireEvent.click(moveDown);
    expect(onReorderStops).toHaveBeenCalledTimes(1);
    // Swap first two: [s1, s2, s3] → [s2, s1, s3]
    expect(onReorderStops.mock.calls[0]![0]).toEqual(["s2", "s1", "s3"]);
  });

  it("Move-up on the first stop is a no-op", () => {
    const onReorderStops = vi.fn();
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={vi.fn()}
        onReorderStops={onReorderStops}
      />,
    );
    const moveUp = Array.from(
      container.querySelectorAll(
        '[data-role="stop-editor"] button[aria-label="Move up"]',
      ),
    )[0] as HTMLButtonElement;
    // Disabled — click should not fire.
    expect(moveUp.disabled).toBe(true);
  });

  it("Remove-stop calls onRemoveStop with the stop id", () => {
    const onRemoveStop = vi.fn();
    const { container } = render(
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={catalog}
        onSelectRoute={vi.fn()}
        onCreateRoute={vi.fn()}
        onDeleteRoute={vi.fn()}
        onSaveRouteMetadata={vi.fn()}
        onAddStop={vi.fn()}
        onRemoveStop={onRemoveStop}
        onReorderStops={vi.fn()}
      />,
    );
    const removes = Array.from(
      container.querySelectorAll('[data-role="stop-editor"] button'),
    ).filter((b) => b.textContent === "Remove");
    fireEvent.click(removes[0]!);
    expect(onRemoveStop).toHaveBeenCalledWith("s1");
  });
});
