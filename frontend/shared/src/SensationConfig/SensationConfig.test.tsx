import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { BodyMarker } from "../BodySilhouette/BodySilhouette.js";
import {
  MARKER_PALETTE,
  SENSATION_TYPE_ORDER,
  SENSATION_TYPES,
  SensationConfig,
} from "./SensationConfig.js";

const baseMarker: BodyMarker = {
  id: "m1",
  view: "front",
  x: 0.5,
  y: 0.33,
  type: "warmth",
  intensity: 7,
  color: "#D98A4E",
  notes: "Steady heat blooming at the heart.",
};

describe("SensationConfig", () => {
  it("exposes 12 sensation types in canonical order", () => {
    expect(SENSATION_TYPE_ORDER).toHaveLength(12);
    SENSATION_TYPE_ORDER.forEach((t) => {
      expect(SENSATION_TYPES[t]).toBeDefined();
    });
  });

  it("exposes the 8-swatch palette separate from tradition tokens", () => {
    expect(MARKER_PALETTE).toHaveLength(8);
    expect(MARKER_PALETTE.every((sw) => sw.color.startsWith("#"))).toBe(true);
  });

  it("renders the active sensation label", () => {
    render(<SensationConfig marker={baseMarker} onChange={vi.fn()} />);
    expect(screen.getByText("Warmth")).toBeInTheDocument();
  });

  it("renders the current intensity (0-10)", () => {
    render(<SensationConfig marker={baseMarker} onChange={vi.fn()} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("7");
  });

  it("emits onChange with the new type AND its canonical color", () => {
    const onChange = vi.fn();
    render(<SensationConfig marker={baseMarker} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Coolness"));
    expect(onChange).toHaveBeenCalledWith({
      type: "coolness",
      color: SENSATION_TYPES.coolness.color,
    });
  });

  it("emits onChange with the new intensity when slider moves", () => {
    const onChange = vi.fn();
    render(<SensationConfig marker={baseMarker} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith({ intensity: 3 });
  });

  it("emits onChange with the new color when a swatch is picked", () => {
    const onChange = vi.fn();
    render(<SensationConfig marker={baseMarker} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Cyan"));
    expect(onChange).toHaveBeenCalledWith({ color: "#5AA0C0" });
  });

  it("emits onChange with notes when the textarea changes", () => {
    const onChange = vi.fn();
    render(<SensationConfig marker={baseMarker} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/What did it feel like/i);
    fireEvent.change(textarea, { target: { value: "A new note." } });
    expect(onChange).toHaveBeenCalledWith({ notes: "A new note." });
  });

  it("calls onDelete when the Remove button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <SensationConfig
        marker={baseMarker}
        onChange={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove this marker/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("calls onDone when the Done button is clicked", () => {
    const onDone = vi.fn();
    render(
      <SensationConfig
        marker={baseMarker}
        onChange={vi.fn()}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByText("Done"));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("hides Remove + Done when no handlers are provided", () => {
    render(<SensationConfig marker={baseMarker} onChange={vi.fn()} />);
    expect(screen.queryByText("Done")).toBeNull();
    expect(screen.queryByRole("button", { name: /remove this marker/i })).toBeNull();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <SensationConfig marker={baseMarker} onChange={vi.fn()} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("sensation-config");
    expect(root.getAttribute("data-marker-id")).toBe("m1");
  });

  it("marks the active type with aria-pressed=true", () => {
    render(<SensationConfig marker={baseMarker} onChange={vi.fn()} />);
    const warmthBtn = screen.getByLabelText("Warmth");
    expect(warmthBtn).toHaveAttribute("aria-pressed", "true");
    const coolBtn = screen.getByLabelText("Coolness");
    expect(coolBtn).toHaveAttribute("aria-pressed", "false");
  });
});
