import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ContractListItem } from "./ContractListItem.js";
import {
  CONTRACT_STATUS_META,
  CONTRACT_STATUS_ORDER,
  ContractStatusPill,
} from "./ContractStatusPill.js";

// ─── ContractStatusPill ───────────────────────────────────────────

describe("ContractStatusPill", () => {
  it.each(CONTRACT_STATUS_ORDER)(
    "renders status=%s with its canonical label",
    (status) => {
      const { container } = render(<ContractStatusPill status={status} />);
      expect(
        screen.getByText(CONTRACT_STATUS_META[status].label),
      ).toBeInTheDocument();
      expect(
        container.firstElementChild?.getAttribute("data-contract-status"),
      ).toBe(status);
    },
  );

  it("supports a label override", () => {
    render(<ContractStatusPill status="active" label="In force" />);
    expect(screen.getByText("In force")).toBeInTheDocument();
    expect(screen.queryByText("Active")).toBeNull();
  });

  it("breached uses --cs-breached (NOT --danger)", () => {
    expect(CONTRACT_STATUS_META.breached.color).toBe("var(--cs-breached)");
    expect(CONTRACT_STATUS_META.breached.color).not.toContain("danger");
  });

  it("CONTRACT_STATUS_ORDER lists six statuses", () => {
    expect(CONTRACT_STATUS_ORDER).toHaveLength(6);
  });

  it("never uses --danger in the rendered pill", () => {
    const { container } = render(
      <ContractStatusPill status="breached" />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── ContractListItem ─────────────────────────────────────────────

describe("ContractListItem", () => {
  it("renders title + entity name + status data attribute", () => {
    render(
      <ContractListItem
        id="c1"
        title="Beltane Pact with Brigid, 2026"
        entityName="Brigid"
        status="active"
      />,
    );
    expect(
      screen.getByText("Beltane Pact with Brigid, 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("Brigid")).toBeInTheDocument();
  });

  it("renders the next-due footer when provided", () => {
    render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="active"
        nextDue="Due in 2 days · spring offering"
      />,
    );
    expect(
      screen.getByText(/Due in 2 days · spring offering/),
    ).toBeInTheDocument();
  });

  it("hides the next-due footer by default", () => {
    const { container } = render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="active"
      />,
    );
    expect(container.querySelector("[data-next-due]")).toBeNull();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="active"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks the selected state with aria-pressed + data-selected", () => {
    const { container } = render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="active"
        selected
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-selected")).toBe("true");
    expect(root.getAttribute("aria-pressed")).toBe("true");
  });

  it("colours the status dot from the contract status", () => {
    const { container } = render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="dissolved"
      />,
    );
    const dot = container.querySelector("[data-status-dot]") as HTMLElement;
    expect(dot.style.background).toBe("var(--cs-dissolved)");
  });

  it("renders the caller-supplied binding glyph slot", () => {
    render(
      <ContractListItem
        id="c1"
        title="Pact"
        entityName="Brigid"
        status="active"
        bindingGlyph={<span data-testid="binding-icon">⚮</span>}
      />,
    );
    expect(screen.getByTestId("binding-icon")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <ContractListItem
        id="c7"
        title="Pact"
        entityName="Brigid"
        status="fulfilled"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-contract-id")).toBe("c7");
    expect(root.getAttribute("data-contract-status")).toBe("fulfilled");
  });
});
