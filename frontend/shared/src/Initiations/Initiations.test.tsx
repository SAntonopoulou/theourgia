import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { InitiationListItem } from "./InitiationListItem.js";
import {
  INITIATION_STATUS_META,
  INITIATION_STATUS_ORDER,
  InitiationStatusPill,
} from "./InitiationStatusPill.js";
import { SealedContentsBlock } from "./SealedContentsBlock.js";

// ─── InitiationStatusPill ─────────────────────────────────────────

describe("InitiationStatusPill", () => {
  it.each(INITIATION_STATUS_ORDER)("renders status=%s", (status) => {
    const { container } = render(
      <InitiationStatusPill status={status} />,
    );
    expect(
      screen.getByText(INITIATION_STATUS_META[status].label),
    ).toBeInTheDocument();
    expect(
      container.firstElementChild?.getAttribute("data-initiation-status"),
    ).toBe(status);
  });

  it("INITIATION_STATUS_ORDER lists four statuses", () => {
    expect(INITIATION_STATUS_ORDER).toHaveLength(4);
  });

  it("suspended + resigned use care palette, NOT --danger", () => {
    expect(INITIATION_STATUS_META.suspended.color).toBe(
      "var(--is-suspended)",
    );
    expect(INITIATION_STATUS_META.resigned.color).toBe(
      "var(--is-resigned)",
    );
  });

  it("never uses --danger", () => {
    const { container } = render(
      <InitiationStatusPill status="suspended" />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── InitiationListItem ───────────────────────────────────────────

describe("InitiationListItem", () => {
  it("renders the tradition name + sealed sublabel", () => {
    render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
      />,
    );
    expect(screen.getByText("Hellenic mystery")).toBeInTheDocument();
    expect(screen.getByText("Sealed")).toBeInTheDocument();
  });

  it("renders the status chip in the row", () => {
    const { container } = render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="suspended"
      />,
    );
    expect(
      container.querySelector("[data-status-chip]"),
    ).toBeInTheDocument();
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders the disclosed footer when provided", () => {
    render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
        disclosed="Disclosed in attestation · 14 May 2026"
      />,
    );
    expect(
      screen.getByText(/Disclosed in attestation · 14 May 2026/),
    ).toBeInTheDocument();
  });

  it("hides the disclosed footer by default", () => {
    const { container } = render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
      />,
    );
    expect(container.querySelector("[data-disclosed]")).toBeNull();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks selected with aria-pressed + data attribute", () => {
    const { container } = render(
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
        selected
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-selected")).toBe("true");
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <InitiationListItem
        id="i7"
        tradition="Hellenic mystery"
        status="lapsed"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-initiation-id")).toBe("i7");
    expect(root.getAttribute("data-initiation-status")).toBe("lapsed");
  });
});

// ─── SealedContentsBlock ──────────────────────────────────────────

describe("SealedContentsBlock", () => {
  it("renders the canonical heading + body + footer verbatim", () => {
    render(<SealedContentsBlock onUnlock={() => {}} />);
    expect(screen.getByText("Sealed contents")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The grade, the date received, the place, who gave and witnessed it/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your passphrase is asked each time — this is the most sensitive record\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders the unlock CTA when onUnlock is provided", () => {
    const onUnlock = vi.fn();
    render(<SealedContentsBlock onUnlock={onUnlock} />);
    const btn = screen.getByText("Unlock to view");
    fireEvent.click(btn);
    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it("hides the CTA when no handler is provided", () => {
    const { container } = render(<SealedContentsBlock />);
    expect(container.querySelector("[data-unlock-button]")).toBeNull();
  });

  it("accepts heading + body + footer overrides", () => {
    render(
      <SealedContentsBlock
        heading="Private contents"
        body="Custom body."
        unlockLabel="Reveal"
        footer="Custom footer."
        onUnlock={() => {}}
      />,
    );
    expect(screen.getByText("Private contents")).toBeInTheDocument();
    expect(screen.getByText("Custom body.")).toBeInTheDocument();
    expect(screen.getByText("Reveal")).toBeInTheDocument();
    expect(screen.getByText("Custom footer.")).toBeInTheDocument();
  });

  it("uses --seal palette (no --danger)", () => {
    const { container } = render(<SealedContentsBlock />);
    expect(container.innerHTML).not.toContain("--danger");
    expect(container.innerHTML).toContain("--seal");
  });
});
