import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AttestationKindBadge } from "./AttestationKindBadge.js";
import { AttestationListItem } from "./AttestationListItem.js";
import {
  ATTESTATION_KIND_META,
  ATTESTATION_KIND_ORDER,
} from "./attestations.js";

// ─── AttestationKindBadge ─────────────────────────────────────────

describe("AttestationKindBadge", () => {
  it.each(ATTESTATION_KIND_ORDER)("renders kind=%s", (kind) => {
    const { container } = render(<AttestationKindBadge kind={kind} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-attestation-kind")).toBe(kind);
  });

  it("ATTESTATION_KIND_ORDER lists seven kinds", () => {
    expect(ATTESTATION_KIND_ORDER).toHaveLength(7);
  });

  it("every kind binds to an --at-* token (no literal hex colours)", () => {
    ATTESTATION_KIND_ORDER.forEach((kind) => {
      expect(ATTESTATION_KIND_META[kind].color).toMatch(/^var\(--at-/);
    });
  });

  it("never uses --danger anywhere", () => {
    ATTESTATION_KIND_ORDER.forEach((kind) => {
      expect(ATTESTATION_KIND_META[kind].color).not.toContain("danger");
    });
  });

  it("size 24 is the small variant; 40 is the large variant", () => {
    const { container: small } = render(
      <AttestationKindBadge kind="initiation" size={24} />,
    );
    const { container: large } = render(
      <AttestationKindBadge kind="initiation" size={40} />,
    );
    expect(
      (small.firstElementChild as HTMLElement).style.width,
    ).toBe("24px");
    expect(
      (large.firstElementChild as HTMLElement).style.width,
    ).toBe("40px");
  });

  it("renders the bordered variant only when requested", () => {
    const { container: bare } = render(
      <AttestationKindBadge kind="initiation" />,
    );
    const { container: bordered } = render(
      <AttestationKindBadge kind="initiation" bordered />,
    );
    expect(
      (bare.firstElementChild as HTMLElement).style.borderStyle,
    ).toBe("");
    expect(
      (bordered.firstElementChild as HTMLElement).style.borderStyle,
    ).toBe("solid");
  });

  it("passes title to the badge for hover hints", () => {
    const { container } = render(
      <AttestationKindBadge kind="initiation" title="A claim of initiation" />,
    );
    expect(
      (container.firstElementChild as HTMLElement).title,
    ).toBe("A claim of initiation");
  });
});

// ─── AttestationListItem ──────────────────────────────────────────

const baseProps = {
  id: "a1",
  subject: "Aspasia",
  description: "Initiation as Minerval in the Lyceum tradition.",
  kind: "initiation" as const,
  signatureCount: 2,
  visibilityLabel: "Public",
  grantedLabel: "20 March 2020",
};

describe("AttestationListItem", () => {
  it("renders subject + description + visibility + granted-at", () => {
    render(<AttestationListItem {...baseProps} />);
    expect(screen.getByText("Aspasia")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Initiation as Minerval in the Lyceum tradition.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("20 March 2020")).toBeInTheDocument();
  });

  it("renders the kind label from metadata", () => {
    render(<AttestationListItem {...baseProps} />);
    expect(
      screen.getByText(ATTESTATION_KIND_META.initiation.label),
    ).toBeInTheDocument();
  });

  it("hides the revoked pill by default", () => {
    const { container } = render(<AttestationListItem {...baseProps} />);
    expect(container.querySelector("[data-revoked-pill]")).toBeNull();
  });

  it("renders the revoked pill when revoked=true", () => {
    render(<AttestationListItem {...baseProps} revoked />);
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });

  it("dims revoked rows via opacity 0.78", () => {
    const { container } = render(
      <AttestationListItem {...baseProps} revoked />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.opacity).toBe("0.78");
  });

  it("calls onSelect with the id when clicked", () => {
    const onSelect = vi.fn();
    render(<AttestationListItem {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("a1");
  });

  it("marks the selected state with aria-pressed + data-selected", () => {
    const { container } = render(
      <AttestationListItem {...baseProps} selected />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-selected")).toBe("true");
    expect(root.style.background).toBe("var(--bg-3)");
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <AttestationListItem
        {...baseProps}
        id="a7"
        kind="grade-granted"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-attestation-id")).toBe("a7");
    expect(root.getAttribute("data-attestation-kind")).toBe("grade-granted");
    expect(root.getAttribute("data-revoked")).toBe("false");
  });

  it("never includes --danger", () => {
    const { container } = render(
      <AttestationListItem {...baseProps} revoked />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
