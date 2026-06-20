import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stat } from "./index.js";

describe("Stat", () => {
  it("renders label + value", () => {
    render(<Stat label="Entries this week" value={42} />);
    expect(screen.getByText("Entries this week")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("omits spark when no array supplied", () => {
    const { container } = render(<Stat label="X" value={1} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a sparkline when 2+ points supplied", () => {
    const { container } = render(<Stat label="X" value={1} spark={[1, 2, 3, 4]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector("polyline")).not.toBeNull();
  });

  it("doesn't render the spark for 1-point series", () => {
    const { container } = render(<Stat label="X" value={1} spark={[1]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("delta sign drives tone (positive → success color)", () => {
    render(<Stat label="X" value={10} delta={12.5} />);
    const deltaSpan = screen.getByText("+12.5%");
    expect(deltaSpan.style.color).toBe("var(--success)");
  });

  it("delta sign drives tone (negative → danger color)", () => {
    render(<Stat label="X" value={10} delta={-3.1} />);
    const deltaSpan = screen.getByText("-3.1%");
    expect(deltaSpan.style.color).toBe("var(--danger)");
  });

  it("explicit tone overrides the auto-detected sign tone", () => {
    render(<Stat label="X" value={10} delta={-1} tone="positive" />);
    expect(screen.getByText("-1%").style.color).toBe("var(--success)");
  });

  it("delta unit defaults to '%' but can be overridden", () => {
    render(<Stat label="X" value={10} delta={5} deltaUnit=" ms" />);
    expect(screen.getByText(/\+5 ms/)).toBeInTheDocument();
  });
});
