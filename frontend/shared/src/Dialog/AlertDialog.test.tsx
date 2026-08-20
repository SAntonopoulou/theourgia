import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { _resetScrollLock } from "../Overlay/scrollLock.js";
import { AlertDialog } from "./index.js";

describe("AlertDialog", () => {
  afterEach(() => {
    _resetScrollLock();
  });

  it("renders as role=alertdialog", () => {
    render(<AlertDialog open title="Sealed" acknowledgeLabel="OK" onAcknowledge={vi.fn()} />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("has a single button (no cancel)", () => {
    render(<AlertDialog open title="Sealed" acknowledgeLabel="OK" onAcknowledge={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("clicking acknowledge calls onAcknowledge", async () => {
    const onAcknowledge = vi.fn();
    render(<AlertDialog open title="Sealed" acknowledgeLabel="OK" onAcknowledge={onAcknowledge} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "OK" }));
    expect(onAcknowledge).toHaveBeenCalledOnce();
  });

  it("ESC is ignored by default (alerts are not dismissible)", async () => {
    const onAcknowledge = vi.fn();
    render(<AlertDialog open title="X" acknowledgeLabel="OK" onAcknowledge={onAcknowledge} />);
    await userEvent.setup().keyboard("{Escape}");
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("ESC closes when dismissible=true", async () => {
    const onAcknowledge = vi.fn();
    render(
      <AlertDialog
        open
        title="X"
        acknowledgeLabel="OK"
        dismissible
        onAcknowledge={onAcknowledge}
      />,
    );
    // The overlay traps focus inside itself on open via requestAnimationFrame,
    // and ESC only reaches the handler (which lives on the backdrop) once focus
    // is within. Wait for that frame to land instead of racing it — under CI
    // load a too-eager keypress fires on <body>, misses the portal, and the
    // spy sees nothing. That race is the whole of this test's historic flake.
    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toHaveFocus());
    await userEvent.setup().keyboard("{Escape}");
    expect(onAcknowledge).toHaveBeenCalledOnce();
  });

  it("danger tone uses the danger button variant", () => {
    render(
      <AlertDialog
        open
        tone="danger"
        title="Sealed"
        acknowledgeLabel="OK"
        onAcknowledge={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "OK" }).style.backgroundColor).toBe("var(--danger)");
  });
});
