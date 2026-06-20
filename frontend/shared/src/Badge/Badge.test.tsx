import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./index.js";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Verified</Badge>);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("defaults to tone=neutral", () => {
    render(<Badge>X</Badge>);
    expect(screen.getByText("X")).toHaveAttribute("data-tone", "neutral");
  });

  it.each([
    ["info", "var(--info)"],
    ["success", "var(--success)"],
    ["warning", "var(--warning)"],
    ["danger", "var(--danger)"],
    ["trust", "var(--accent)"],
  ])("tone=%s uses the right token color", (tone, expectedColor) => {
    render(<Badge tone={tone as "info" | "success" | "warning" | "danger" | "trust"}>X</Badge>);
    expect(screen.getByText("X").style.color).toBe(expectedColor);
  });

  it("renders a glyph when supplied", () => {
    const { container } = render(<Badge glyph="lock">Sealed</Badge>);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#theo-lock");
  });
});
