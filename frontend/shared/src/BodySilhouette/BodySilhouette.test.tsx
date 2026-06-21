import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  BodySilhouette,
  type BodyMarker,
  type SilhouetteView,
} from "./BodySilhouette.js";

const markers: BodyMarker[] = [
  {
    id: "m1",
    view: "front",
    x: 0.5,
    y: 0.33,
    type: "warmth",
    intensity: 7,
    color: "#D98A4E",
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
];

describe("BodySilhouette", () => {
  it.each<SilhouetteView>(["front", "back", "left", "right", "palm", "sole"])(
    "renders without error for view=%s",
    (view) => {
      const { container } = render(<BodySilhouette view={view} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute("data-view")).toBe(view);
    },
  );

  it("filters markers to the current view", () => {
    const { container } = render(
      <BodySilhouette view="front" markers={markers} />,
    );
    expect(container.querySelectorAll("[data-marker-id]")).toHaveLength(1);
    expect(container.querySelector("[data-marker-id='m1']")).toBeInTheDocument();
    expect(container.querySelector("[data-marker-id='m2']")).toBeNull();
  });

  it("renders no marker buttons when markers prop is omitted", () => {
    const { container } = render(<BodySilhouette view="front" />);
    expect(container.querySelectorAll("[data-marker-id]")).toHaveLength(0);
  });

  it("calls onSelect when a marker is clicked, and does NOT call onPlace", () => {
    const onPlace = vi.fn();
    const onSelect = vi.fn();
    render(
      <BodySilhouette
        view="front"
        markers={markers}
        onPlace={onPlace}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /warmth/i }));
    expect(onSelect).toHaveBeenCalledWith("m1");
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("calls onPlace with normalized [0,1] coordinates when stage is clicked", () => {
    const onPlace = vi.fn();
    const { container } = render(
      <BodySilhouette view="front" onPlace={onPlace} />,
    );
    const stage = container.firstElementChild as HTMLElement;
    // Stub getBoundingClientRect on the stage so the calculation is deterministic.
    stage.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 430,
        width: 300,
        height: 430,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;
    fireEvent.click(stage, { clientX: 150, clientY: 215 });
    expect(onPlace).toHaveBeenCalledTimes(1);
    const arg = onPlace.mock.calls[0]![0]!;
    expect(arg.x).toBeCloseTo(0.5, 2);
    expect(arg.y).toBeCloseTo(0.5, 2);
  });

  it("applies the structural data attributes", () => {
    const { container } = render(
      <BodySilhouette view="left" morphology="broad" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("body-silhouette");
    expect(root.getAttribute("data-view")).toBe("left");
    expect(root.getAttribute("data-morphology")).toBe("broad");
  });

  it("marks the selected marker with a higher z-index halo", () => {
    const { container } = render(
      <BodySilhouette
        view="front"
        markers={markers}
        selectedId="m1"
      />,
    );
    const marker = container.querySelector("[data-marker-id='m1']") as HTMLElement;
    expect(marker.style.zIndex).toBe("3");
  });

  it("marker buttons expose an accessible name with intensity", () => {
    render(<BodySilhouette view="front" markers={markers} />);
    expect(
      screen.getByRole("button", { name: /warmth at intensity 7/i }),
    ).toBeInTheDocument();
  });

  it("the stage exposes role=application + aria-label", () => {
    const { container } = render(<BodySilhouette view="front" />);
    const stage = container.firstElementChild as HTMLElement;
    expect(stage.getAttribute("role")).toBe("application");
    expect(stage.getAttribute("aria-label")).toMatch(/body figure/i);
  });
});
