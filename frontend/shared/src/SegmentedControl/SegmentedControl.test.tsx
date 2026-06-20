import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./index.js";

const OPTIONS = [
  { value: "personal" as const, label: "Personal" },
  { value: "viewer" as const, label: "Viewer" },
  { value: "network" as const, label: "Network" },
];

describe("SegmentedControl", () => {
  it("renders all options", () => {
    render(<SegmentedControl options={OPTIONS} value="personal" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Personal" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Network" })).toBeInTheDocument();
  });

  it("marks the matching option aria-checked", () => {
    render(<SegmentedControl options={OPTIONS} value="viewer" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Viewer" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Personal" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("only the selected option is in the tab order", () => {
    render(<SegmentedControl options={OPTIONS} value="network" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Personal" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("radio", { name: "Viewer" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("radio", { name: "Network" })).toHaveAttribute("tabIndex", "0");
  });

  it("clicking an option fires onChange with its value", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="personal" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Viewer" }));
    expect(onChange).toHaveBeenCalledWith("viewer");
  });

  it("ArrowRight moves to the next option", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="personal" onChange={onChange} />);
    const user = userEvent.setup();
    screen.getByRole("radio", { name: "Personal" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("viewer");
  });

  it("ArrowLeft from the first option wraps to the last", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="personal" onChange={onChange} />);
    const user = userEvent.setup();
    screen.getByRole("radio", { name: "Personal" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("network");
  });

  it("Home jumps to first, End jumps to last", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="viewer" onChange={onChange} />);
    const user = userEvent.setup();
    screen.getByRole("radio", { name: "Viewer" }).focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("network");
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("personal");
  });

  it("renders the radiogroup with ariaLabel", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="personal"
        onChange={vi.fn()}
        ariaLabel="Visibility"
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Visibility" })).toBeInTheDocument();
  });

  it("disabled prevents click + sets aria-disabled", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="personal" onChange={onChange} disabled />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Viewer" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders an option's glyph when supplied", () => {
    const withGlyph = [
      { value: "sun" as const, label: "Solar", glyph: "sun" as const },
      { value: "moon" as const, label: "Lunar", glyph: "moon" as const },
    ];
    const { container } = render(
      <SegmentedControl options={withGlyph} value="sun" onChange={vi.fn()} />,
    );
    const uses = container.querySelectorAll("use");
    expect(uses[0]?.getAttribute("href")).toBe("#theo-sun");
    expect(uses[1]?.getAttribute("href")).toBe("#theo-moon");
  });
});
