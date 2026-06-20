import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./index.js";

describe("Switch", () => {
  it("renders as a switch role with the label as accessible name", () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Federation" />);
    expect(screen.getByRole("switch", { name: "Federation" })).toBeInTheDocument();
  });

  it("reflects checked state via aria-checked", () => {
    const { rerender } = render(<Switch checked={false} onChange={vi.fn()} label="X" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<Switch checked onChange={vi.fn()} label="X" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on click", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="X" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles on Space", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="X" />);
    const user = userEvent.setup();
    const sw = screen.getByRole("switch");
    sw.focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles on Enter", async () => {
    const onChange = vi.fn();
    render(<Switch checked={true} onChange={onChange} label="X" />);
    const user = userEvent.setup();
    const sw = screen.getByRole("switch");
    sw.focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disabled blocks click + keyboard activation", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="X" disabled />);
    const user = userEvent.setup();
    const sw = screen.getByRole("switch");
    await user.click(sw);
    expect(onChange).not.toHaveBeenCalled();
    expect(sw).toBeDisabled();
  });

  it("supports label-end positioning", () => {
    const { rerender } = render(
      <Switch checked={false} onChange={vi.fn()} label="L" labelPosition="start" />,
    );
    const initialOrder = Array.from(screen.getByRole("switch").parentElement?.childNodes ?? []);
    expect(initialOrder[0]?.textContent).toBe("L");
    rerender(<Switch checked={false} onChange={vi.fn()} label="L" labelPosition="end" />);
    const flippedOrder = Array.from(screen.getByRole("switch").parentElement?.childNodes ?? []);
    expect(flippedOrder[flippedOrder.length - 1]?.textContent).toBe("L");
  });
});
