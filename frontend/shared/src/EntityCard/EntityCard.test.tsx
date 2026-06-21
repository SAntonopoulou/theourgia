import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  EntityCard,
  type EntitySummary,
} from "./EntityCard.js";

const hekate: EntitySummary = {
  id: "hekate",
  name: "Hekate",
  kind: "deity",
  tradition: "Hellenic",
  status: "active",
  summary: "Goddess of the crossroads, the keys, and the restless dead.",
  due: "Deipnon · in 2 days",
  views: ["Hekate (all)", "Chthonic powers"],
};

const severed: EntitySummary = {
  id: "marbas",
  name: "Marbas",
  kind: "spirit",
  tradition: "Goetic",
  status: "severed",
  summary: "Approached once in a matter of health; the working is closed.",
};

describe("EntityCard", () => {
  it("renders the name + kind + group line", () => {
    render(<EntityCard entity={hekate} />);
    expect(screen.getByText("Hekate")).toBeInTheDocument();
    expect(screen.getByText(/Deity · Venerated/)).toBeInTheDocument();
  });

  it("renders the tradition badge and the relationship status pill", () => {
    render(<EntityCard entity={hekate} />);
    expect(screen.getByText("Hellenic")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("attaches data attributes for downstream selection / styling", () => {
    const { container } = render(<EntityCard entity={hekate} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-entity-id")).toBe("hekate");
    expect(root.getAttribute("data-relationship-status")).toBe("active");
    expect(root.getAttribute("data-function-group")).toBe("venerated");
  });

  it("renders due hint when provided", () => {
    render(<EntityCard entity={hekate} />);
    expect(screen.getByText("Deipnon · in 2 days")).toBeInTheDocument();
  });

  it("renders saved-view chips", () => {
    render(<EntityCard entity={hekate} />);
    expect(screen.getByText("Hekate (all)")).toBeInTheDocument();
    expect(screen.getByText("Chthonic powers")).toBeInTheDocument();
  });

  it("renders only the actions that are wired", () => {
    const onOffer = vi.fn();
    render(<EntityCard entity={hekate} onOffer={onOffer} />);
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.queryByText("Work")).toBeNull();
    expect(screen.queryByText("Aggregate")).toBeNull();
  });

  it("fires quick-action handlers when clicked", () => {
    const onOffer = vi.fn();
    const onWork = vi.fn();
    const onAggregate = vi.fn();
    render(
      <EntityCard
        entity={hekate}
        onOffer={onOffer}
        onWork={onWork}
        onAggregate={onAggregate}
      />,
    );
    fireEvent.click(screen.getByText("Offer"));
    fireEvent.click(screen.getByText("Work"));
    fireEvent.click(screen.getByText("Aggregate"));
    expect(onOffer).toHaveBeenCalledOnce();
    expect(onWork).toHaveBeenCalledOnce();
    expect(onAggregate).toHaveBeenCalledOnce();
  });

  it("renders a checkbox role when onToggleSelect is provided", () => {
    const onToggleSelect = vi.fn();
    render(
      <EntityCard
        entity={hekate}
        onToggleSelect={onToggleSelect}
        selected={false}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: /Select Hekate/i });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith(true);
  });

  it("renders the federation unread dot when set", () => {
    render(<EntityCard entity={{ ...hekate, unread: true }} />);
    expect(screen.getByLabelText("New federated update")).toBeInTheDocument();
  });

  it("marks severed entities with the care-palette data attribute", () => {
    const { container } = render(<EntityCard entity={severed} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-relationship-status")).toBe("severed");
    // The severed style is dimmed but DOES NOT use --danger.
    expect(root.outerHTML).not.toContain("--danger");
  });

  it("falls back to the name initial in the avatar slot when no avatar supplied", () => {
    render(<EntityCard entity={hekate} />);
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("respects a custom avatar slot", () => {
    render(
      <EntityCard
        entity={hekate}
        avatar={<span data-testid="custom-avatar">σ</span>}
      />,
    );
    expect(screen.getByTestId("custom-avatar")).toBeInTheDocument();
  });
});
