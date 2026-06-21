import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./index.js";

describe("AppShell", () => {
  it("renders the topbar + main content", () => {
    const { container } = render(
      <AppShell topbar={<div>TOPBAR</div>}>
        <p>main content</p>
      </AppShell>,
    );
    expect(screen.getByText("TOPBAR")).toBeInTheDocument();
    expect(screen.getByText("main content")).toBeInTheDocument();
    expect(container.querySelector(".om-shell")).not.toBeNull();
  });

  it("renders the nav when supplied", () => {
    render(
      <AppShell topbar={<div>T</div>} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    expect(screen.getByText("NAV")).toBeInTheDocument();
  });

  it("renders the om-scrim when nav is supplied", () => {
    const { container } = render(
      <AppShell topbar={<div>T</div>} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    expect(container.querySelector(".om-scrim")).not.toBeNull();
  });

  it("doesn't render the scrim without a nav", () => {
    const { container } = render(
      <AppShell topbar={<div>T</div>}>
        <p>c</p>
      </AppShell>,
    );
    expect(container.querySelector(".om-scrim")).toBeNull();
  });

  it("injects onMenuToggle into the topbar element when it accepts it", async () => {
    const onMenuToggle = vi.fn();
    function FakeTopbar({ onMenuToggle: t }: { onMenuToggle?: () => void }) {
      return (
        <button type="button" onClick={() => t?.()}>
          burger
        </button>
      );
    }
    render(
      <AppShell topbar={<FakeTopbar onMenuToggle={onMenuToggle} />} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    // Consumer-supplied handler takes precedence; AppShell only fills in
    // when none is given.
    await userEvent.setup().click(screen.getByText("burger"));
    expect(onMenuToggle).toHaveBeenCalled();
  });

  it("fills in onMenuToggle when none is supplied", async () => {
    function FakeTopbar({ onMenuToggle: t }: { onMenuToggle?: () => void }) {
      return (
        <button type="button" onClick={() => t?.()}>
          burger
        </button>
      );
    }
    const { container } = render(
      <AppShell topbar={<FakeTopbar />} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    const shell = container.querySelector(".om-shell") as HTMLElement;
    expect(shell.getAttribute("data-nav-open")).toBe("false");
    await userEvent.setup().click(screen.getByText("burger"));
    expect(shell.getAttribute("data-nav-open")).toBe("true");
  });

  it("ESC closes the open drawer", async () => {
    function FakeTopbar({ onMenuToggle: t }: { onMenuToggle?: () => void }) {
      return (
        <button type="button" onClick={() => t?.()}>
          burger
        </button>
      );
    }
    const { container } = render(
      <AppShell topbar={<FakeTopbar />} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    const shell = container.querySelector(".om-shell") as HTMLElement;
    const user = userEvent.setup();
    await user.click(screen.getByText("burger"));
    expect(shell.getAttribute("data-nav-open")).toBe("true");
    await user.keyboard("{Escape}");
    expect(shell.getAttribute("data-nav-open")).toBe("false");
  });
});
