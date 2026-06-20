import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./index.js";

describe("Skeleton", () => {
  it("renders with role=status for SR announcement", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("default kind is text", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "text");
  });

  it.each(["text", "rect", "circle"] as const)("kind=%s sets data-kind", (kind) => {
    render(<Skeleton kind={kind} />);
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", kind);
  });

  it("circle kind uses border-radius 50%", () => {
    render(<Skeleton kind="circle" />);
    expect(screen.getByRole("status")).toHaveStyle({ borderRadius: "50%" });
  });

  it("custom dimensions override the defaults", () => {
    render(<Skeleton kind="rect" width={200} height={120} />);
    const el = screen.getByRole("status");
    expect(el).toHaveStyle({ width: "200px", height: "120px" });
  });

  it("ariaLabel defaults to 'Loading'", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("ariaLabel can be customized", () => {
    render(<Skeleton ariaLabel="Fetching journal" />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Fetching journal");
  });

  it("injects the pulse keyframes exactly once", () => {
    render(<Skeleton />);
    render(<Skeleton />);
    render(<Skeleton />);
    const styles = document.querySelectorAll("style#theourgia-skeleton-pulse");
    expect(styles).toHaveLength(1);
  });
});
