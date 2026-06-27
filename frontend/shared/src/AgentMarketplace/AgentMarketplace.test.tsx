/**
 * AgentMarketplace — H10 Cluster C2 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  AgentMarketplaceSurface,
  type MarketAgentCard,
} from "./AgentMarketplaceSurface.js";
import { SORT_OPTIONS } from "./copy.js";

const CARDS: MarketAgentCard[] = [
  {
    id: "ag-divination",
    name: "Divination companion",
    kind: "divination",
    tier: "official",
    description:
      "Surfaces resonance across your past readings — recurring symbols, repeated cards.",
    capabilityLabel: "5 capabilities, read-only",
  },
  {
    id: "ag-sync",
    name: "Synchronicity weaver",
    kind: "synchronicity",
    tier: "community",
    description:
      "Finds quiet threads between your synchronicity log and your workings.",
    capabilityLabel: "6 capabilities, read-only",
  },
  {
    id: "ag-archivist",
    name: "Archivist",
    kind: "archivist",
    tier: "unverified",
    description:
      "Organises and tags older entries on request.",
    capabilityLabel: "7 capabilities, read-write",
  },
];

describe("AgentMarketplaceSurface", () => {
  test("rule 38 — sort options NEVER include popularity", () => {
    const labels = SORT_OPTIONS.map((s) => s.label.toLowerCase());
    expect(labels).toContain("alphabetical");
    expect(labels).toContain("recently added");
    expect(labels.some((l) => l.includes("popular"))).toBe(false);
    expect(labels.some((l) => l.includes("trend"))).toBe(false);
    expect(labels.some((l) => l.includes("rank"))).toBe(false);
  });

  test("renders every card with name + tier + capability label", () => {
    render(<AgentMarketplaceSurface cards={CARDS} />);
    expect(screen.getByText("Divination companion")).toBeInTheDocument();
    expect(
      screen.getByText("5 capabilities, read-only"),
    ).toBeInTheDocument();
    expect(screen.getByText("Synchronicity weaver")).toBeInTheDocument();
    expect(screen.getByText("Archivist")).toBeInTheDocument();
  });

  test("rule 29 — three tier labels render with neutral chrome", () => {
    render(<AgentMarketplaceSurface cards={CARDS} />);
    // Each tier appears at least once — either on a card chip or in
    // the filter <option>.
    expect(screen.getAllByText("Official").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Community").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unverified").length).toBeGreaterThan(0);
  });

  test("clicking a card fires onOpen with the agent id", () => {
    const onOpen = vi.fn();
    render(
      <AgentMarketplaceSurface cards={CARDS} onOpen={onOpen} />,
    );
    fireEvent.click(screen.getByText("Synchronicity weaver"));
    expect(onOpen).toHaveBeenCalledWith("ag-sync");
  });

  test("rule 60 — NO 'install' CTA on cards (install goes through C3)", () => {
    const { container } = render(
      <AgentMarketplaceSurface cards={CARDS} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain(">install<");
    expect(html).not.toContain("install now");
    expect(html).not.toContain("install agent");
  });

  test("rule 38 — NO 'trending' / 'featured' anywhere", () => {
    const { container } = render(
      <AgentMarketplaceSurface cards={CARDS} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("trending");
    expect(html).not.toContain("featured");
    expect(html).not.toContain("popular");
  });

  test("filter callbacks fire with the chosen values", () => {
    const onSourceChange = vi.fn();
    const onCapabilityChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <AgentMarketplaceSurface
        cards={CARDS}
        onSourceChange={onSourceChange}
        onCapabilityChange={onCapabilityChange}
        onSortChange={onSortChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Source filter"), {
      target: { value: "official" },
    });
    expect(onSourceChange).toHaveBeenCalledWith("official");
    fireEvent.change(screen.getByLabelText("Capability filter"), {
      target: { value: "read_only" },
    });
    expect(onCapabilityChange).toHaveBeenCalledWith("read_only");
    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "recently_added" },
    });
    expect(onSortChange).toHaveBeenCalledWith("recently_added");
  });

  test("empty state when no agent plugins installed", () => {
    render(<AgentMarketplaceSurface cards={[]} />);
    expect(
      screen.getByText(
        /The agent layer is plugin-driven; once you install agent plugins/i,
      ),
    ).toBeInTheDocument();
  });

  test("View detail label appears once per card", () => {
    render(<AgentMarketplaceSurface cards={CARDS} />);
    expect(screen.getAllByText("View detail").length).toBe(CARDS.length);
  });
});
