import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SealUnlock, SealedBadge, SessionLockIndicator } from "./index.js";

describe("SealedBadge", () => {
  it("defaults to the sealed form with the canonical tooltip", () => {
    render(<SealedBadge />);
    const badge = screen.getByText("Sealed").closest("span") as HTMLElement;
    expect(badge.title).toBe(
      "Only readable on a device with your passphrase",
    );
    expect(badge.dataset.sealed).toBe("true");
    expect(badge.style.color).toBe("var(--seal)");
    expect(badge.style.background).toBe("var(--seal-soft)");
  });

  it("uses --seal-border for the outline", () => {
    render(<SealedBadge />);
    const badge = screen.getByText("Sealed").closest("span") as HTMLElement;
    expect(badge.style.borderColor).toBe("var(--seal-border)");
  });

  it("renders the public form when sealed=false (open lock, ink-soft, no tooltip)", () => {
    render(<SealedBadge sealed={false} />);
    const badge = screen.getByText("Public").closest("span") as HTMLElement;
    expect(badge.dataset.sealed).toBe("false");
    expect(badge.style.color).toBe("var(--ink-soft)");
    expect(badge.title).toBe("");
  });

  it("honors a custom label override", () => {
    render(<SealedBadge label="Encrypted" />);
    expect(screen.getByText("Encrypted")).toBeInTheDocument();
  });

  it("never uses --danger / --danger-bg (calm violet only)", () => {
    render(<SealedBadge />);
    const badge = screen.getByText("Sealed").closest("span") as HTMLElement;
    expect(badge.style.color).not.toContain("danger");
    expect(badge.style.background).not.toContain("danger");
  });
});

describe("SessionLockIndicator", () => {
  it("locked form: shows 'Vault locked' with seal palette", () => {
    render(<SessionLockIndicator locked={true} onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: /Vault locked/i });
    expect(button.style.color).toBe("var(--seal)");
    expect(button.style.background).toBe("var(--seal-soft)");
    expect(button.dataset.locked).toBe("true");
  });

  it("unlocked form: shows 'Vault unlocked' with --os-active palette", () => {
    render(<SessionLockIndicator locked={false} onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: /Vault unlocked/i });
    expect(button.style.color).toBe("var(--os-active)");
    expect(button.dataset.locked).toBe("false");
  });

  it("aria-pressed reflects the unlocked state", () => {
    const { rerender } = render(
      <SessionLockIndicator locked={true} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "false",
    );
    rerender(<SessionLockIndicator locked={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("fires onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<SessionLockIndicator locked={true} onToggle={onToggle} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("SealUnlock", () => {
  it("renders the title + canonical session-policy body", () => {
    render(
      <SealUnlock open onUnlock={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: /Unlock the vault/i }))
      .toBeInTheDocument();
    expect(
      screen.getByText(/decrypts sealed oaths on this device only/i),
    ).toBeInTheDocument();
  });

  it("session policy: stay-toggle defaults ON with 'this session' copy", () => {
    render(
      <SealUnlock open policy="session" onUnlock={vi.fn()} onCancel={vi.fn()} />,
    );
    const toggle = screen.getByRole("switch", {
      name: /Stay unlocked for this session/i,
    });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("per-read policy: stay-toggle defaults OFF with '5 minutes' copy", () => {
    render(
      <SealUnlock open policy="per-read" onUnlock={vi.fn()} onCancel={vi.fn()} />,
    );
    const toggle = screen.getByRole("switch", {
      name: /Stay unlocked for 5 minutes/i,
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(
      screen.getByText(
        /decrypts sealed initiations on this device for this single read/i,
      ),
    ).toBeInTheDocument();
  });

  it("Unlock button is disabled until a passphrase is typed", async () => {
    const onUnlock = vi.fn();
    render(<SealUnlock open onUnlock={onUnlock} onCancel={vi.fn()} />);
    const unlock = screen.getByRole("button", { name: /^Unlock$/i });
    expect(unlock).toBeDisabled();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Passphrase"), "secret");
    expect(unlock).not.toBeDisabled();
  });

  it("fires onUnlock(passphrase, stay) on Unlock", async () => {
    const onUnlock = vi.fn();
    render(<SealUnlock open onUnlock={onUnlock} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Passphrase"), "hekate");
    await user.click(screen.getByRole("button", { name: /^Unlock$/i }));
    expect(onUnlock).toHaveBeenCalledWith("hekate", true);
  });

  it("toggling stay changes the boolean passed to onUnlock", async () => {
    const onUnlock = vi.fn();
    render(
      <SealUnlock
        open
        policy="session"
        onUnlock={onUnlock}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("switch", { name: /Stay unlocked for this session/i }),
    );
    await user.type(screen.getByPlaceholderText("Passphrase"), "p");
    await user.click(screen.getByRole("button", { name: /^Unlock$/i }));
    expect(onUnlock).toHaveBeenCalledWith("p", false);
  });

  it("Enter in the input submits", async () => {
    const onUnlock = vi.fn();
    render(<SealUnlock open onUnlock={onUnlock} onCancel={vi.fn()} />);
    const input = screen.getByPlaceholderText("Passphrase");
    const user = userEvent.setup();
    await user.type(input, "abc{Enter}");
    expect(onUnlock).toHaveBeenCalled();
  });

  it("Cancel calls onCancel", async () => {
    const onCancel = vi.fn();
    render(<SealUnlock open onUnlock={vi.fn()} onCancel={onCancel} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ESC closes via Overlay", async () => {
    const onCancel = vi.fn();
    render(<SealUnlock open onUnlock={vi.fn()} onCancel={onCancel} />);
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("renders an inline error alert when errorMessage is given", () => {
    render(
      <SealUnlock
        open
        onUnlock={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="Passphrase didn't decrypt — try again"
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Passphrase didn't decrypt");
    expect(alert.style.color).toBe("var(--warn)");
    expect(screen.getByPlaceholderText("Passphrase").getAttribute("aria-invalid"))
      .toBe("true");
  });

  it("resets passphrase + stay on close→open", async () => {
    const onUnlock = vi.fn();
    const { rerender } = render(
      <SealUnlock
        open
        policy="session"
        onUnlock={onUnlock}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Passphrase"), "stuff");
    rerender(
      <SealUnlock
        open={false}
        policy="session"
        onUnlock={onUnlock}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <SealUnlock
        open
        policy="session"
        onUnlock={onUnlock}
        onCancel={vi.fn()}
      />,
    );
    expect(
      (screen.getByPlaceholderText("Passphrase") as HTMLInputElement).value,
    ).toBe("");
  });

  it("does not render when open=false", () => {
    render(<SealUnlock open={false} onUnlock={vi.fn()} onCancel={vi.fn()} />);
    expect(
      screen.queryByRole("heading", { name: /Unlock the vault/i }),
    ).toBeNull();
  });
});
