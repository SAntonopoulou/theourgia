import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./index.js";

type Listener = (event: MediaQueryListEvent) => void;

class FakeMQL {
  matches: boolean;
  media: string;
  listeners = new Set<Listener>();
  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }
  addEventListener(_type: "change", l: Listener): void {
    this.listeners.add(l);
  }
  removeEventListener(_type: "change", l: Listener): void {
    this.listeners.delete(l);
  }
}

describe("AppShell", () => {
  let originalMatchMedia: typeof window.matchMedia;

  function withViewport(matches: boolean): void {
    // @ts-expect-error happy-dom doesn't ship matchMedia
    window.matchMedia = vi.fn(() => new FakeMQL("(min-width: 768px)", matches));
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the header + content always", () => {
    withViewport(true);
    render(
      <AppShell header={<div>HEADER</div>}>
        <p>main content</p>
      </AppShell>,
    );
    expect(screen.getByText("HEADER")).toBeInTheDocument();
    expect(screen.getByText("main content")).toBeInTheDocument();
  });

  it("on desktop with nav, renders the nav inline (no hamburger)", () => {
    withViewport(true);
    render(
      <AppShell header={<div>H</div>} nav={<nav>NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    expect(screen.getByText("NAV")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open navigation" })).toBeNull();
  });

  it("on mobile with nav, renders a hamburger that opens the Drawer", async () => {
    withViewport(false);
    render(
      <AppShell header={<div>H</div>} nav={<nav>MOBILE NAV</nav>}>
        <p>c</p>
      </AppShell>,
    );
    const hamburger = screen.getByRole("button", { name: "Open navigation" });
    expect(hamburger).toBeInTheDocument();
    // Drawer not visible yet
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.setup().click(hamburger);
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
    expect(screen.getAllByText("MOBILE NAV")[0]).toBeInTheDocument();
  });

  it("without nav, no hamburger or sidebar appears even on mobile", () => {
    withViewport(false);
    render(
      <AppShell header={<div>H</div>}>
        <p>c</p>
      </AppShell>,
    );
    expect(screen.queryByRole("button", { name: "Open navigation" })).toBeNull();
  });
});
