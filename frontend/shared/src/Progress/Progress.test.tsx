import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "./index.js";

describe("Progress", () => {
  it("renders a native progress element with value + max", () => {
    render(<Progress value={42} max={100} ariaLabel="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("value", "42");
    expect(bar).toHaveAttribute("max", "100");
  });

  it("default max is 100", () => {
    render(<Progress value={30} ariaLabel="X" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "100");
  });

  it("renders the label above the bar and a percentage readout", () => {
    render(<Progress value={25} max={100} label="Backfill" />);
    expect(screen.getByText("Backfill")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("indeterminate state omits value and sets data-indeterminate", () => {
    render(<Progress ariaLabel="Loading" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("value");
    expect(bar).toHaveAttribute("data-indeterminate", "true");
  });

  it("indeterminate does not show a percentage", () => {
    render(<Progress label="Loading" />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("injects the pulse style block exactly once", () => {
    render(<Progress value={10} ariaLabel="A" />);
    render(<Progress value={20} ariaLabel="B" />);
    const styles = document.querySelectorAll("style#theourgia-progress-styles");
    expect(styles).toHaveLength(1);
  });
});
