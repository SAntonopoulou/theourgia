import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VaultNav, type VaultNavItem } from "./index.js";

const NAV: VaultNavItem[] = [
  { to: "/", label: "Today", glyph: "sun" },
  { to: "/journal", label: "Journal", glyph: "journal" },
  { to: "/library", label: "Library", glyph: "library", badge: 3 },
  { to: "/foundations", label: "Foundations", glyph: "scroll", dev: true },
];

describe("VaultNav", () => {
  it("renders one link per item", () => {
    render(<VaultNav items={NAV} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Foundations")).toBeInTheDocument();
  });

  it("default link renderer uses <a href=>", () => {
    const { container } = render(<VaultNav items={NAV} />);
    const journalLink = container.querySelector('a[href="/journal"]');
    expect(journalLink).not.toBeNull();
  });

  it("isActive flips the active item's color to var(--accent)", () => {
    render(<VaultNav items={NAV} isActive={(to) => to === "/journal"} />);
    const journal = screen.getByText("Journal").closest("a") as HTMLElement;
    expect(journal.style.color).toBe("var(--accent)");
  });

  it("renders a Badge when item.badge is supplied", () => {
    render(<VaultNav items={NAV} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("dev items get a 'dev' marker", () => {
    render(<VaultNav items={NAV} />);
    expect(screen.getByText("dev")).toBeInTheDocument();
  });

  it("clicking a link fires onNavigate", async () => {
    const onNavigate = vi.fn();
    render(<VaultNav items={NAV} onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Journal"));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("renders an optional heading", () => {
    render(<VaultNav items={NAV} heading="Vault" />);
    expect(screen.getByText("Vault")).toBeInTheDocument();
  });

  it("custom LinkComponent is used in place of the default <a>", () => {
    function CustomLink({ to, children }: { to: string; children: React.ReactNode }) {
      return (
        <button type="button" data-href={to}>
          {children}
        </button>
      );
    }
    render(<VaultNav items={NAV} LinkComponent={CustomLink as never} />);
    const journal = screen.getByText("Journal").closest("button") as HTMLElement;
    expect(journal).toHaveAttribute("data-href", "/journal");
  });
});
