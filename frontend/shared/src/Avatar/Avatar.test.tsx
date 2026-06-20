import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, Medallion } from "./index.js";

describe("Medallion", () => {
  it("renders the named glyph", () => {
    const { container } = render(<Medallion glyph="moon" />);
    expect(container.querySelector("use")?.getAttribute("href")).toBe("#theo-moon");
  });

  it("sets size in pixels", () => {
    const { container } = render(<Medallion glyph="moon" size="lg" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: "56px", height: "56px" });
  });

  it("tone is exposed via data-tone", () => {
    const { container } = render(<Medallion glyph="key" tone="danger" />);
    expect(container.firstChild).toHaveAttribute("data-tone", "danger");
  });

  it("with title becomes role=img with accessible name", () => {
    render(<Medallion glyph="key" title="Sealed" />);
    expect(screen.getByRole("img", { name: "Sealed" })).toBeInTheDocument();
  });

  it("without title is aria-hidden (decorative)", () => {
    const { container } = render(<Medallion glyph="key" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Avatar", () => {
  it("renders Medallion fallback when no photoUrl", () => {
    const { container } = render(<Avatar identity={{ name: "Soror Eva", glyph: "moon" }} />);
    expect(container.querySelector("use")?.getAttribute("href")).toBe("#theo-moon");
  });

  it("defaults to entity glyph when none supplied", () => {
    const { container } = render(<Avatar identity={{ name: "Anonymous" }} />);
    expect(container.querySelector("use")?.getAttribute("href")).toBe("#theo-entity");
  });

  it("renders an <img> when photoUrl supplied", () => {
    render(<Avatar identity={{ name: "Soror Eva", photoUrl: "https://example.test/a.png" }} />);
    const img = screen.getByRole("img", { name: "Soror Eva" });
    expect(img).toHaveAttribute("src", "https://example.test/a.png");
  });

  it("falls back to Medallion when image fails to load", () => {
    const { container } = render(
      <Avatar
        identity={{
          name: "Soror Eva",
          photoUrl: "https://invalid.test/missing.png",
          glyph: "sigil",
        }}
      />,
    );
    const img = screen.getByRole("img", { name: "Soror Eva" });
    fireEvent.error(img);
    expect(container.querySelector("use")?.getAttribute("href")).toBe("#theo-sigil");
  });

  it.each([
    ["sm", "24px"],
    ["md", "36px"],
    ["lg", "56px"],
    ["xl", "96px"],
  ])("size=%s yields the documented dimensions", (size, px) => {
    const { container } = render(
      <Avatar identity={{ name: "x" }} size={size as "sm" | "md" | "lg" | "xl"} />,
    );
    expect(container.firstChild as HTMLElement).toHaveStyle({ width: px, height: px });
  });
});
