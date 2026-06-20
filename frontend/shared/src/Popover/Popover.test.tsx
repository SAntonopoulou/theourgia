import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Popover } from "./index.js";

describe("Popover", () => {
  it("renders the trigger but no content when closed", () => {
    render(
      <Popover open={false} onClose={vi.fn()} trigger={<button type="button">Open</button>}>
        content
      </Popover>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.queryByText("content")).toBeNull();
  });

  it("renders the content (role=dialog by default) when open", () => {
    render(
      <Popover open onClose={vi.fn()} trigger={<button type="button">Open</button>}>
        content
      </Popover>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sets aria-expanded + aria-haspopup on the trigger", () => {
    render(
      <Popover open onClose={vi.fn()} trigger={<button type="button">Open</button>} role="menu">
        content
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("ESC closes via onClose", () => {
    const onClose = vi.fn();
    render(
      <Popover open onClose={onClose} trigger={<button type="button">Open</button>}>
        content
      </Popover>,
    );
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking outside fires onClose", () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <Popover open onClose={onClose} trigger={<button type="button">Open</button>}>
          content
        </Popover>
      </div>,
    );
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("outside"));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking inside the trigger does NOT fire onClose", () => {
    const onClose = vi.fn();
    render(
      <Popover open onClose={onClose} trigger={<button type="button">Open</button>}>
        content
      </Popover>,
    );
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Open" }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
