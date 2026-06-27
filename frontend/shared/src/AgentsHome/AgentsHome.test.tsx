/**
 * AgentsHome — H10 Cluster C1 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  AgentsHomeSurface,
  type AgentRow,
  type DisabledAgentRow,
} from "./AgentsHomeSurface.js";
import { EDITORIAL_INTRO } from "./copy.js";

const ACTIVE: AgentRow[] = [
  {
    id: "ag-divination",
    name: "Divination companion",
    kind: "divination",
    lastActive: "2 hours ago",
    status: "active",
  },
  {
    id: "ag-sync",
    name: "Synchronicity weaver",
    kind: "synchronicity",
    lastActive: "yesterday",
    status: "cost-capped",
  },
];

const DISABLED: DisabledAgentRow[] = [
  { id: "ag-study", name: "Study tutor", kind: "study" },
];

describe("AgentsHomeSurface", () => {
  test("rule 60 — editorial intro renders verbatim", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(screen.getByText(EDITORIAL_INTRO)).toBeInTheDocument();
  });

  test("rule 50 + 60 — empty state frames agents as truly optional", () => {
    render(<AgentsHomeSurface active={[]} disabled={[]} />);
    expect(
      screen.getByText(/No active agents/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /you can keep your vault agent-free; nothing here requires them/i,
      ),
    ).toBeInTheDocument();
  });

  test("rule 60 — NO promotional language ('try the agent layer', 'get started', etc.)", () => {
    const { container } = render(
      <AgentsHomeSurface active={[]} disabled={[]} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("try the agent layer");
    expect(html).not.toContain("get started");
    expect(html).not.toContain("unlock");
    expect(html).not.toContain("upgrade");
    expect(html).not.toContain("free trial");
  });

  test("rule 54 — editorial uses 'surface', 'lens', 'draw attention to' — NOT 'interpret'/'tell you'", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(
      screen.getByText(/surface what is already in your own record/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/a lens you may pick up or set down/i),
    ).toBeInTheDocument();
    const text =
      screen.getByText(EDITORIAL_INTRO).textContent?.toLowerCase() ?? "";
    expect(text).not.toContain("interpret");
    expect(text).not.toContain("tell you what");
    expect(text).not.toContain("decode");
  });

  test("rule 51 — editorial states agent never speaks first", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(
      screen.getByText(/An agent never speaks first; it acts only when you ask/i),
    ).toBeInTheDocument();
  });

  test("rule 52 + 53 — editorial states closed-tradition + sealed exclusion", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(
      screen.getByText(
        /never sees sealed or closed-tradition content/i,
      ),
    ).toBeInTheDocument();
  });

  test("active agents render with status chips", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(screen.getByText("Divination companion")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("cost-capped")).toBeInTheDocument();
  });

  test("disabled agents preserve memory — chrome states this", () => {
    render(<AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />);
    expect(
      screen.getByText(/Disabled agents keep their memory/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Disabled · memory preserved"),
    ).toBeInTheDocument();
    expect(screen.getByText("paused")).toBeInTheDocument();
  });

  test("clicking an active agent fires onOpen with the agent id", () => {
    const onOpen = vi.fn();
    render(
      <AgentsHomeSurface
        active={ACTIVE}
        disabled={DISABLED}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByText("Divination companion"));
    expect(onOpen).toHaveBeenCalledWith("ag-divination");
  });

  test("'Browse the marketplace' button fires onBrowseMarketplace", () => {
    const onBrowseMarketplace = vi.fn();
    render(
      <AgentsHomeSurface
        active={ACTIVE}
        disabled={DISABLED}
        onBrowseMarketplace={onBrowseMarketplace}
      />,
    );
    fireEvent.click(screen.getByText("Browse the marketplace"));
    expect(onBrowseMarketplace).toHaveBeenCalledTimes(1);
  });

  test("sub-nav highlights the active tab", () => {
    const { container } = render(
      <AgentsHomeSurface active={[]} disabled={[]} activeNav="agents" />,
    );
    const agentsTab = container.querySelector('[data-subnav="agents"]');
    const styles = agentsTab?.getAttribute("style") ?? "";
    expect(styles).toContain("var(--accent-soft)");
  });

  test("rule 9 — no token-usage / cost numbers on row chrome (those live on C10)", () => {
    const { container } = render(
      <AgentsHomeSurface active={ACTIVE} disabled={DISABLED} />,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toMatch(/\d+,\d{3}\s*tokens/);
  });
});
