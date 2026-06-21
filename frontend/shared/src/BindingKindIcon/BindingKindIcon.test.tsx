import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  type BindingKind,
  BindingKindIcon,
  bindingKindLabel,
} from "./index.js";

describe("BindingKindIcon", () => {
  const allKinds: readonly BindingKind[] = [
    "verbal",
    "written",
    "blood",
    "breath",
    "item-bound",
    "name-bound",
    "other",
  ];

  it("renders an svg for each binding kind", () => {
    for (const kind of allKinds) {
      const { container, unmount } = render(<BindingKindIcon kind={kind} />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("blood glyph uses --bind-blood stroke (care-desaturated, never gory)", () => {
    const { container } = render(<BindingKindIcon kind="blood" />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("stroke")).toBe("var(--bind-blood)");
  });

  it("non-blood glyphs use currentColor (inherits container ink)", () => {
    for (const kind of allKinds.filter((k) => k !== "blood")) {
      const { container, unmount } = render(<BindingKindIcon kind={kind} />);
      const svg = container.querySelector("svg") as SVGElement;
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      unmount();
    }
  });

  it("size prop sets width + height", () => {
    const { container } = render(<BindingKindIcon kind="verbal" size={24} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
  });

  it("default size is 18", () => {
    const { container } = render(<BindingKindIcon kind="verbal" />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("18");
  });

  it("every kind is aria-hidden (decorative)", () => {
    for (const kind of allKinds) {
      const { container, unmount } = render(<BindingKindIcon kind={kind} />);
      const svg = container.querySelector("svg") as SVGElement;
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("bindingKindLabel returns lowercase canonical labels", () => {
    expect(bindingKindLabel("verbal")).toBe("verbal");
    expect(bindingKindLabel("item-bound")).toBe("item-bound");
    expect(bindingKindLabel("name-bound")).toBe("name-bound");
    expect(bindingKindLabel("blood")).toBe("blood");
  });
});
