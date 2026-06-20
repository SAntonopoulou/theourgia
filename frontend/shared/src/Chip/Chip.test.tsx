import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Chip } from "./index.js";

describe("Chip", () => {
  it("renders a non-interactive span when no onToggle is supplied", () => {
    const { container } = render(<Chip label="Hellenic" />);
    expect(container.querySelector("span")).toHaveTextContent("Hellenic");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("renders as a switch when onToggle is supplied", () => {
    render(<Chip label="Hellenic" onToggle={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Hellenic" })).toBeInTheDocument();
  });

  it("aria-checked + aria-pressed mirror the selected state", () => {
    render(<Chip label="X" selected onToggle={vi.fn()} />);
    const chip = screen.getByRole("switch");
    expect(chip).toHaveAttribute("aria-checked", "true");
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("toggling fires onToggle(next)", async () => {
    const onToggle = vi.fn();
    render(<Chip label="X" selected={false} onToggle={onToggle} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("keyboard activation (Space) toggles", async () => {
    const onToggle = vi.fn();
    render(<Chip label="X" selected={true} onToggle={onToggle} />);
    const user = userEvent.setup();
    screen.getByRole("switch").focus();
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("removable + onToggle renders as button with a Remove label", () => {
    render(<Chip label="Hellenic" removable selected onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove Hellenic" })).toBeInTheDocument();
  });

  it("removable activation calls onToggle(false) regardless of selected state", async () => {
    const onToggle = vi.fn();
    render(<Chip label="Hellenic" removable selected onToggle={onToggle} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("renders a glyph when supplied", () => {
    const { container } = render(<Chip label="Journal" glyph="journal" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#theo-journal");
  });

  it("disabled prevents click", async () => {
    const onToggle = vi.fn();
    render(<Chip label="X" onToggle={onToggle} disabled />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
