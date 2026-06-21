import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BEINGS_TABS, BeingsTabs, DEFAULT_HREF_FOR } from "./index.js";

describe("BeingsTabs", () => {
  it("renders all 8 tabs in canonical order", () => {
    render(<BeingsTabs />);
    const labels = BEINGS_TABS.map((t) => t.label);
    expect(labels).toEqual([
      "Entities",
      "Offerings",
      "Contracts",
      "Oaths",
      "Initiations",
      "Servitors",
      "Attestations",
      "Aliases",
    ]);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses the canonical default routes for each tab", () => {
    const { container } = render(<BeingsTabs />);
    for (const key of Object.keys(DEFAULT_HREF_FOR) as Array<
      keyof typeof DEFAULT_HREF_FOR
    >) {
      const link = container.querySelector(`a[href="${DEFAULT_HREF_FOR[key]}"]`);
      expect(link).not.toBeNull();
    }
  });

  it("hrefFor override is honored", () => {
    const hrefFor = (k: string) => `/custom/${k}`;
    const { container } = render(
      <BeingsTabs active="oaths" hrefFor={hrefFor} />,
    );
    expect(container.querySelector('a[href="/custom/oaths"]')).not.toBeNull();
    expect(container.querySelector('a[href="/custom/entities"]')).not.toBeNull();
  });

  it("active tab carries aria-current=page", () => {
    const { container } = render(<BeingsTabs active="oaths" />);
    const active = container.querySelector('a[aria-current="page"]');
    expect(active).not.toBeNull();
    expect(active?.textContent).toContain("Oaths");
  });

  it("only one tab is active at a time", () => {
    const { container } = render(<BeingsTabs active="attestations" />);
    const allActive = container.querySelectorAll('a[aria-current="page"]');
    expect(allActive).toHaveLength(1);
  });

  it("active tab uses accent border-bottom and ink color", () => {
    render(<BeingsTabs active="initiations" />);
    const tab = screen.getByText("Initiations").closest("a") as HTMLElement;
    expect(tab.style.borderBottomColor).toBe("var(--accent)");
    expect(tab.style.color).toBe("var(--ink)");
  });

  it("inactive tab stays ink-mute, no border", () => {
    render(<BeingsTabs active="initiations" />);
    const tab = screen.getByText("Oaths").closest("a") as HTMLElement;
    expect(tab.style.color).toBe("var(--ink-mute)");
    expect(tab.style.borderBottomColor).toBe("transparent");
  });

  it("active tab icon uses its per-tab token", () => {
    const { container } = render(<BeingsTabs active="oaths" />);
    const oathsLink = container.querySelector('a[aria-current="page"]');
    // The icon span carries color: var(--bt-oaths) when active.
    const iconSpan = oathsLink?.querySelector("span") as HTMLElement;
    expect(iconSpan.style.color).toBe("var(--bt-oaths)");
  });

  it("inactive icons render with currentColor", () => {
    render(<BeingsTabs active="oaths" />);
    const entitiesLink = screen.getByText("Entities").closest("a")!;
    const iconSpan = entitiesLink.querySelector("span") as HTMLElement;
    expect(iconSpan.style.color).toBe("currentcolor");
  });

  it("fires onNavigate with the picked key", async () => {
    const onNavigate = vi.fn();
    render(<BeingsTabs active="entities" onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Servitors"));
    expect(onNavigate).toHaveBeenCalledWith("servitors");
  });

  it("nav has the right aria-label + scroll affordance class", () => {
    const { container } = render(<BeingsTabs />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.getAttribute("aria-label")).toBe("Relational ledger");
    expect(nav.className).toContain("scroll");
  });

  it("nav uses overflow-x:auto so it scrolls horizontally on mobile", () => {
    const { container } = render(<BeingsTabs />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.style.overflowX).toBe("auto");
  });

  it("can render with no active tab (specimen / preview mode)", () => {
    const { container } = render(<BeingsTabs />);
    const active = container.querySelector('a[aria-current="page"]');
    expect(active).toBeNull();
  });

  it("custom LinkComponent is used in place of <a>", () => {
    const Link = ({ to, children }: { to: string; children: React.ReactNode }) => (
      <button data-href={to}>{children}</button>
    );
    const { container } = render(
      <BeingsTabs active="entities" LinkComponent={Link as never} />,
    );
    expect(container.querySelectorAll("button")).toHaveLength(8);
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("each tab is keyboard-focusable", () => {
    const { container } = render(<BeingsTabs />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(8);
    // Links are inherently focusable; no tabindex=-1 anywhere.
    links.forEach((link) => {
      expect(link.getAttribute("tabindex")).not.toBe("-1");
    });
  });
});
