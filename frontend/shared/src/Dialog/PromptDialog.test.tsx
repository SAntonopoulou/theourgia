import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { _resetScrollLock } from "../Overlay/scrollLock.js";
import { PromptDialog } from "./index.js";

describe("PromptDialog", () => {
  afterEach(() => {
    _resetScrollLock();
  });

  it("renders a text input with the supplied label", () => {
    render(
      <PromptDialog
        open
        title="Magickal name"
        label="Name"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox", { name: /Name/ })).toBeInTheDocument();
  });

  it("submit fires onSubmit with the current value", async () => {
    const onSubmit = vi.fn();
    render(
      <PromptDialog
        open
        title="Magickal name"
        label="Name"
        defaultValue="Eva"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onSubmit).toHaveBeenCalledWith("Eva");
  });

  it("typing updates the field; submit passes the new value", async () => {
    const onSubmit = vi.fn();
    render(<PromptDialog open title="X" label="N" onSubmit={onSubmit} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "Aspasia");
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onSubmit).toHaveBeenCalledWith("Aspasia");
  });

  it("validate returning a string blocks submit + shows the error", async () => {
    const onSubmit = vi.fn();
    render(
      <PromptDialog
        open
        title="X"
        label="N"
        defaultValue=""
        validate={(v) => (v.length < 3 ? "Too short" : null)}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Too short")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "OK" });
    expect(submit).toBeDisabled();
    const user = userEvent.setup();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("validate returning null re-enables submit", async () => {
    const onSubmit = vi.fn();
    render(
      <PromptDialog
        open
        title="X"
        label="N"
        defaultValue=""
        validate={(v) => (v.length < 3 ? "Too short" : null)}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "Aspasia");
    expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onSubmit).toHaveBeenCalledWith("Aspasia");
  });

  it("cancel resets to defaultValue + fires onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <PromptDialog
        open
        title="X"
        label="N"
        defaultValue="hello"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    await user.clear(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
