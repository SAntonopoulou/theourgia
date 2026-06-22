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

  // ─── H04 Practice section additions ─────────────────────────────

  it("renders the H04 'Daily practice' entry under Practice", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/daily-practice"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Daily practice");
  });

  it("renders the H04 'Practice log' entry under Practice", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/practice-logs"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Practice log");
  });

  it("Divination entry repointed to /divination/tarot (H04 canonical)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/divination/tarot"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Divination");
  });

  it("active=dailypractice highlights the Daily practice entry", () => {
    render(<VaultNav active="dailypractice" />);
    const daily = screen.getByText("Daily practice").closest("a") as HTMLElement;
    expect(daily.style.background).toBe("var(--accent-soft)");
    expect(daily.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
  });

  it("active=practicelogs highlights the Practice log entry", () => {
    render(<VaultNav active="practicelogs" />);
    const logs = screen.getByText("Practice log").closest("a") as HTMLElement;
    expect(logs.style.background).toBe("var(--accent-soft)");
    expect(logs.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
  });

  it("DEFAULT_VAULT_NAV Practice section has all 5 H04 entries in order", () => {
    const practice = DEFAULT_VAULT_NAV.find((s) => s.heading === "Practice");
    expect(practice).toBeDefined();
    expect(practice?.items.map((i) => i.key)).toEqual([
      "today",
      "journal",
      "synchronicities",
      "dailypractice",
      "practicelogs",
    ]);
  });

  // ─── H05 — Workshop section extension ───────────────────────────

  it("DEFAULT_VAULT_NAV Workbench section has all 7 H05 entries in order", () => {
    const workbench = DEFAULT_VAULT_NAV.find((s) => s.heading === "Workbench");
    expect(workbench).toBeDefined();
    expect(workbench?.items.map((i) => i.key)).toEqual([
      "divination",
      "sigils",
      "magicsquares",
      "talismans",
      "circles",
      "tools",
      "voces",
    ]);
  });

  it("H05 Sigil Generator route is /sigils (renamed from /sigil)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/sigils"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Sigil Generator");
  });

  it("H05 Magic Squares route is /magic-squares (new entry)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/magic-squares"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Magic Squares");
  });

  it("H05 Magical Circle route is /circles (renamed from /circle)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/circles"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Magical Circle");
  });

  it("H05 Talisman Designer label updated (was 'Talismans')", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/talismans"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Talisman Designer");
  });

  it("H05 Tool Registry route is /tools (new entry)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/tools"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Tool Registry");
  });

  it("H05 Voces Magicae route is /voces (new entry)", () => {
    const { container } = render(<VaultNav />);
    const link = container.querySelector('a[href="/voces"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Voces Magicae");
  });

  it.each([
    "sigils",
    "magicsquares",
    "talismans",
    "circles",
    "tools",
    "voces",
  ] as const)("active=%s highlights its Workbench entry", (key) => {
    render(<VaultNav active={key} />);
    // Each Workshop entry's label maps 1:1 to a known text node.
    const labelByKey: Record<typeof key, string> = {
      sigils: "Sigil Generator",
      magicsquares: "Magic Squares",
      talismans: "Talisman Designer",
      circles: "Magical Circle",
      tools: "Tool Registry",
      voces: "Voces Magicae",
    };
    const link = screen.getByText(labelByKey[key]).closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
    expect(link.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
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
