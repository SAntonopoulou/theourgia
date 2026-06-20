import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { _resetScrollLock } from "../Overlay/scrollLock.js";
import { ConfirmDialog } from "./index.js";

describe("ConfirmDialog", () => {
  afterEach(() => {
    _resetScrollLock();
  });

  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Archive entry"
        confirmLabel="Archive"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the title + body + buttons when open", () => {
    render(
      <ConfirmDialog
        open
        title="Archive entry"
        body="The entry will be moved to the archive."
        confirmLabel="Archive"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Archive entry")).toBeInTheDocument();
    expect(screen.getByText("The entry will be moved to the archive.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("clicking confirm calls onConfirm", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open title="X" confirmLabel="Yes" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("clicking cancel calls onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="X"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "No" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("ESC closes via onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="X" confirmLabel="Yes" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("destructive tone uses the danger button variant", () => {
    render(
      <ConfirmDialog
        open
        tone="destructive"
        title="Delete"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm.style.backgroundColor).toBe("var(--danger)");
  });

  it("locks body scroll while open", () => {
    document.body.style.overflow = "";
    const { rerender } = render(
      <ConfirmDialog open title="X" confirmLabel="OK" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <ConfirmDialog
        open={false}
        title="X"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("dialog is labelled by the title", () => {
    render(
      <ConfirmDialog
        open
        title="Archive entry"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Archive entry" })).toBeInTheDocument();
  });
});
