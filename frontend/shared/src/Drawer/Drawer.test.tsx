import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { _resetScrollLock } from "../Overlay/scrollLock.js";
import { Drawer } from "./index.js";

describe("Drawer", () => {
  afterEach(() => {
    _resetScrollLock();
  });

  it("renders nothing when closed", () => {
    render(
      <Drawer open={false} title="Settings" onClose={vi.fn()}>
        body
      </Drawer>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders title + body + close button when open", () => {
    render(
      <Drawer open title="Settings" onClose={vi.fn()}>
        <p>panel content</p>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("panel content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("clicking Close fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Settings" onClose={onClose}>
        body
      </Drawer>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ESC fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Settings" onClose={onClose}>
        body
      </Drawer>,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closeOnEsc=false ignores ESC", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="X" onClose={onClose} closeOnEsc={false}>
        body
      </Drawer>,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open", () => {
    document.body.style.overflow = "";
    const { rerender } = render(
      <Drawer open title="X" onClose={vi.fn()}>
        x
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Drawer open={false} title="X" onClose={vi.fn()}>
        x
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe("");
  });
});
