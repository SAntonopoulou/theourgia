/**
 * RelationshipStatusPill tests.
 *
 * jsdom drops `color-mix(...)` values from inline `border:` shorthand
 * (and from `background:` when other property-values fail to parse).
 * We assert on the structural data-relationship-status attribute and
 * the visible label rather than inspecting rendered colors. The
 * visual baselines cover the actual color rendering.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  RELATIONSHIP_STATUS_META,
  RelationshipStatusPill,
} from "./RelationshipStatusPill.js";

describe("RelationshipStatusPill", () => {
  it.each([
    "active",
    "open",
    "contracted",
    "observing",
    "dormant",
    "severed",
  ] as const)("renders the canonical label for status=%s", (status) => {
    render(<RelationshipStatusPill status={status} />);
    const pill = screen.getByText(RELATIONSHIP_STATUS_META[status].label);
    expect(pill).toBeInTheDocument();
    const root = pill.closest("[data-relationship-status]");
    expect(root).toHaveAttribute("data-relationship-status", status);
  });

  it("accepts a label override", () => {
    render(<RelationshipStatusPill status="active" label="Currently working" />);
    expect(screen.getByText("Currently working")).toBeInTheDocument();
    expect(screen.queryByText("Active")).toBeNull();
  });

  it("attaches the status attribute for downstream styling", () => {
    const { container } = render(<RelationshipStatusPill status="severed" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-relationship-status")).toBe("severed");
  });

  it("severed uses the care-palette token, not danger", () => {
    expect(RELATIONSHIP_STATUS_META.severed.color).toBe("var(--st-severed)");
    expect(RELATIONSHIP_STATUS_META.severed.color).not.toContain("danger");
  });

  it("applies the structural pill shape via inline style", () => {
    const { container } = render(<RelationshipStatusPill status="open" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.display).toBe("inline-flex");
    expect(root.style.borderRadius).toBe("999px");
  });

  it("renders the colour-dot decoration as aria-hidden", () => {
    const { container } = render(<RelationshipStatusPill status="active" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it("merges caller-provided style overrides", () => {
    const { container } = render(
      <RelationshipStatusPill status="active" style={{ marginLeft: 12 }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.marginLeft).toBe("12px");
  });
});
