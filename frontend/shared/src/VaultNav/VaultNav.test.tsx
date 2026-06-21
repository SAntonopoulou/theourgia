import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_VAULT_NAV, VaultNav } from "./index.js";

describe("VaultNav", () => {
  it("renders one link per item in DEFAULT_VAULT_NAV", () => {
    render(<VaultNav />);
    for (const section of DEFAULT_VAULT_NAV) {
      for (const item of section.items) {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      }
    }
  });

  it("renders every section heading", () => {
    render(<VaultNav />);
    for (const section of DEFAULT_VAULT_NAV) {
      expect(screen.getByText(section.heading)).toBeInTheDocument();
    }
  });

  it("default link renderer uses <a href=>", () => {
    const { container } = render(<VaultNav />);
    const journalLink = container.querySelector('a[href="/journal"]');
    expect(journalLink).not.toBeNull();
  });

  it("active item carries the accent-soft background + inset accent bar", () => {
    render(<VaultNav active="journal" />);
    const journal = screen.getByText("Journal").closest("a") as HTMLElement;
    expect(journal.style.background).toBe("var(--accent-soft)");
    expect(journal.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
    expect(journal.style.color).toBe("var(--ink)");
  });

  it("non-active items remain ink-soft, no background", () => {
    render(<VaultNav active="journal" />);
    const today = screen.getByText("Today").closest("a") as HTMLElement;
    expect(today.style.color).toBe("var(--ink-soft)");
    expect(today.style.background).toBe("");
  });

  it("Quick capture button fires onQuickCapture", async () => {
    const onQuickCapture = vi.fn();
    render(<VaultNav onQuickCapture={onQuickCapture} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /quick capture/i }));
    expect(onQuickCapture).toHaveBeenCalled();
  });

  it("Settings button fires onSettings", async () => {
    const onSettings = vi.fn();
    render(<VaultNav onSettings={onSettings} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(onSettings).toHaveBeenCalled();
  });

  it("clicking a nav link fires onNavigate", async () => {
    const onNavigate = vi.fn();
    render(<VaultNav onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Journal"));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("identity footer shows the supplied name + role + avatar character", () => {
    render(<VaultNav identity={{ name: "Soror Ευ. Α.", role: "Adeptus Minor" }} />);
    expect(screen.getByText("Soror Ευ. Α.")).toBeInTheDocument();
    expect(screen.getByText("Adeptus Minor")).toBeInTheDocument();
    // Default avatar char is the first letter of the name.
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("custom avatarChar overrides the first-letter default", () => {
    render(<VaultNav identity={{ name: "Aspasia", avatarChar: "Σ" }} />);
    expect(screen.getByText("Σ")).toBeInTheDocument();
  });

  it("custom LinkComponent is used in place of the default <a>", () => {
    function CustomLink({ to, children }: { to: string; children: React.ReactNode }) {
      return (
        <button type="button" data-href={to}>
          {children}
        </button>
      );
    }
    render(<VaultNav LinkComponent={CustomLink as never} />);
    const journal = screen.getByText("Journal").closest("button") as HTMLElement;
    expect(journal).toHaveAttribute("data-href", "/journal");
  });

  it("custom sections override the default tree", () => {
    render(
      <VaultNav
        sections={[
          {
            heading: "Custom",
            items: [{ key: "today", to: "/", label: "Just Today" }],
          },
        ]}
      />,
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Just Today")).toBeInTheDocument();
    // Items from default sections shouldn't appear.
    expect(screen.queryByText("Journal")).toBeNull();
  });
});
