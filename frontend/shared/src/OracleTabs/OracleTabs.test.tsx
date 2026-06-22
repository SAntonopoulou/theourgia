import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ORACLE_DEFAULT_HREF_FOR,
  ORACLE_TABS,
  OracleTabs,
} from "./index.js";

describe("OracleTabs", () => {
  it("renders all 5 tabs in canonical order", () => {
    render(<OracleTabs />);
    const labels = ORACLE_TABS.map((t) => t.label);
    expect(labels).toEqual(["Tarot", "I Ching", "Geomancy", "Runes", "More"]);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses the canonical default routes for each tab", () => {
    const { container } = render(<OracleTabs />);
    for (const key of Object.keys(ORACLE_DEFAULT_HREF_FOR) as Array<
      keyof typeof ORACLE_DEFAULT_HREF_FOR
    >) {
      const link = container.querySelector(
        `a[href="${ORACLE_DEFAULT_HREF_FOR[key]}"]`,
      );
      expect(link).not.toBeNull();
    }
  });

  it("hrefFor override is honored", () => {
    const hrefFor = (k: string) => `/custom/${k}`;
    const { container } = render(
      <OracleTabs active="iching" hrefFor={hrefFor} />,
    );
    expect(container.querySelector('a[href="/custom/iching"]')).not.toBeNull();
    expect(container.querySelector('a[href="/custom/tarot"]')).not.toBeNull();
  });

  it("active tab carries aria-current=page", () => {
    const { container } = render(<OracleTabs active="geomancy" />);
    const active = container.querySelector('a[aria-current="page"]');
    expect(active).not.toBeNull();
    expect(active?.textContent).toContain("Geomancy");
  });

  it("only one tab is active at a time", () => {
    const { container } = render(<OracleTabs active="runes" />);
    const allActive = container.querySelectorAll('a[aria-current="page"]');
    expect(allActive).toHaveLength(1);
  });

  it("active tab uses accent border-bottom and ink color", () => {
    render(<OracleTabs active="tarot" />);
    const tab = screen.getByText("Tarot").closest("a") as HTMLElement;
    expect(tab.style.borderBottomColor).toBe("var(--accent)");
    expect(tab.style.color).toBe("var(--ink)");
  });

  it("inactive tab stays ink-mute, no border", () => {
    render(<OracleTabs active="tarot" />);
    const tab = screen.getByText("I Ching").closest("a") as HTMLElement;
    expect(tab.style.color).toBe("var(--ink-mute)");
    expect(tab.style.borderBottomColor).toBe("transparent");
  });

  it("active tab icon uses its per-tab token", () => {
    const { container } = render(<OracleTabs active="geomancy" />);
    const link = container.querySelector('a[aria-current="page"]');
    const iconSpan = link?.querySelector("span") as HTMLElement;
    expect(iconSpan.style.color).toBe("var(--ot-geomancy)");
  });

  it("inactive icons render with currentColor", () => {
    render(<OracleTabs active="tarot" />);
    const ichingLink = screen.getByText("I Ching").closest("a")!;
    const iconSpan = ichingLink.querySelector("span") as HTMLElement;
    expect(iconSpan.style.color).toBe("currentcolor");
  });

  it("fires onNavigate with the picked key", async () => {
    const onNavigate = vi.fn();
    render(<OracleTabs active="tarot" onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Runes"));
    expect(onNavigate).toHaveBeenCalledWith("runes");
  });

  it("nav has the right aria-label + scroll affordance class", () => {
    const { container } = render(<OracleTabs />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.getAttribute("aria-label")).toBe("Divination methods");
    expect(nav.className).toContain("scroll");
  });

  it("nav uses overflow-x:auto so it scrolls horizontally on mobile", () => {
    const { container } = render(<OracleTabs />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.style.overflowX).toBe("auto");
  });

  it("can render with no active tab (specimen / preview mode)", () => {
    const { container } = render(<OracleTabs />);
    const active = container.querySelector('a[aria-current="page"]');
    expect(active).toBeNull();
  });

  it("custom LinkComponent is used in place of <a>", () => {
    const Link = ({ to, children }: { to: string; children: React.ReactNode }) => (
      <button data-href={to}>{children}</button>
    );
    const { container } = render(
      <OracleTabs active="tarot" LinkComponent={Link as never} />,
    );
    expect(container.querySelectorAll("button")).toHaveLength(5);
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("attaches data-component for downstream tooling", () => {
    const { container } = render(<OracleTabs />);
    expect(
      container.firstElementChild?.getAttribute("data-component"),
    ).toBe("oracle-tabs");
  });

  it("each tab is keyboard-focusable", () => {
    const { container } = render(<OracleTabs />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(5);
    links.forEach((link) => {
      expect(link.getAttribute("tabindex")).not.toBe("-1");
    });
  });
});
