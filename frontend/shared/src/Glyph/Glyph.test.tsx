import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Glyph, GLYPH_NAMES, isGlyphName } from "./index.js";

describe("Glyph", () => {
  it("renders the engraving symbol by name", () => {
    const { container } = render(<Glyph name="journal" />);
    const use = container.querySelector("use");
    expect(use).not.toBeNull();
    expect(use?.getAttribute("href")).toBe("#theo-journal");
  });

  it("is aria-hidden when no title is supplied (decorative)", () => {
    const { container } = render(<Glyph name="library" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("exposes title text for screen readers when meaningful", () => {
    render(<Glyph name="moon" title="Lunar phase" />);
    const svg = screen.getByRole("img", { name: "Lunar phase" });
    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("uses currentColor and the engraving stroke at the default size", () => {
    const { container } = render(<Glyph name="candle" />);
    const svg = container.querySelector("svg");
    expect(svg?.style.stroke).toBe("currentColor");
    expect(svg?.style.strokeWidth).toBe("1.4");
  });

  it("bumps stroke for small renders (≤16px) so the glyph stays legible", () => {
    const { container } = render(<Glyph name="key" size={14} />);
    const svg = container.querySelector("svg");
    expect(svg?.style.strokeWidth).toBe("2");
  });

  it("honors a custom size", () => {
    const { container } = render(<Glyph name="star" size={40} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("merges caller-supplied style", () => {
    const { container } = render(
      <Glyph name="bell" style={{ opacity: 0.5 }} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.style.opacity).toBe("0.5");
    // Token-set defaults survive
    expect(svg?.style.stroke).toBe("currentColor");
  });
});

describe("GLYPH_NAMES + isGlyphName", () => {
  it("lists every glyph in the engraving sprite", () => {
    // Sanity bound — if the sprite gains glyphs, the count + this assertion update together.
    expect(GLYPH_NAMES.length).toBe(23);
  });

  it("isGlyphName accepts registered names", () => {
    expect(isGlyphName("journal")).toBe(true);
    expect(isGlyphName("library")).toBe(true);
  });

  it("isGlyphName rejects unknown values", () => {
    expect(isGlyphName("not-a-real-glyph")).toBe(false);
    expect(isGlyphName(42)).toBe(false);
    expect(isGlyphName(null)).toBe(false);
  });
});
