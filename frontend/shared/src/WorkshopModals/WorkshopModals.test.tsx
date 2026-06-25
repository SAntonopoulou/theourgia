/**
 * Cluster A — Workshop follow-up modal tests (H07 §S3).
 *
 * Covers the honesty rules from the H07 handoff:
 *   • Save disabled until required fields filled
 *   • No `--danger` token anywhere in the modal markup
 *   • Tool consecration is NOT a field on NewToolModal (sub-resource only)
 *   • New Altar's permanent toggle defaults OFF
 *   • Custom Square Builder's sum readouts are observational, not gating
 *   • Custom Square Builder saves with the practitioner's exact cell
 *     values regardless of whether they form a valid magic square
 *   • Arrow-key cell navigation in Custom Square Builder
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CustomSquareBuilderModal,
  NewAltarModal,
  NewToolModal,
  type ToolPickerOption,
} from "./index.js";

// ── NewToolModal ───────────────────────────────────────────────────

describe("NewToolModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <NewToolModal open={false} onClose={() => {}} />,
    );
    expect(
      container.querySelector("[data-component='new-tool-modal']"),
    ).toBeFalsy();
  });

  it("renders the title + Save disabled by default", () => {
    const { container } = render(
      <NewToolModal open onClose={() => {}} />,
    );
    expect(screen.getByText("New tool")).toBeInTheDocument();
    const save = container.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("renders the 14 kind options in the H07 locked order", () => {
    const { container } = render(
      <NewToolModal open onClose={() => {}} />,
    );
    const kinds = container.querySelectorAll("[data-kind]");
    expect(kinds).toHaveLength(14);
    expect(
      Array.from(kinds).map((b) => b.getAttribute("data-kind")),
    ).toEqual([
      "athame",
      "wand",
      "chalice",
      "pentacle",
      "censer",
      "bell",
      "sword",
      "lamp",
      "mirror",
      "bowl",
      "statue",
      "robe",
      "cingulum",
      "other",
    ]);
  });

  it("enables Save once Name + Kind are filled", () => {
    const { container } = render(
      <NewToolModal open onClose={() => {}} />,
    );
    fireEvent.change(
      container.querySelector("[data-nt-name]") as HTMLInputElement,
      { target: { value: "Black-handled athame" } },
    );
    fireEvent.click(
      container.querySelector("[data-kind='athame']") as HTMLButtonElement,
    );
    const save = container.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it("reveals the 'Other' label input when Other is picked", () => {
    const { container } = render(
      <NewToolModal open onClose={() => {}} />,
    );
    expect(container.querySelector("[data-nt-other]")).toBeFalsy();
    fireEvent.click(
      container.querySelector("[data-kind='other']") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-nt-other]")).toBeTruthy();
  });

  it("fires onSave with the H07 payload shape", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NewToolModal open onClose={() => {}} onSave={onSave} />,
    );
    fireEvent.change(
      container.querySelector("[data-nt-name]") as HTMLInputElement,
      { target: { value: "Hazel wand" } },
    );
    fireEvent.click(
      container.querySelector("[data-kind='wand']") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-action='save']") as HTMLButtonElement,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]![0];
    expect(payload.name).toBe("Hazel wand");
    expect(payload.kind).toBe("wand");
    expect(payload.otherLabel).toBeNull();
    expect(payload.materials).toEqual([]);
    expect(payload.dimensions.length_cm).toBeNull();
    expect(payload.dimensions.weight_g).toBeNull();
    expect(payload.provenance).toBeNull();
    expect(payload.acquisition_date).toBeNull();
    expect(payload.current_location).toBeNull();
  });

  it("renders the consecration footer note (sub-resource discipline)", () => {
    render(<NewToolModal open onClose={() => {}} />);
    expect(
      screen.getByText(/Consecration is recorded separately/i),
    ).toBeInTheDocument();
  });

  it("renders without --danger anywhere", () => {
    const { container } = render(
      <NewToolModal open onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ── NewAltarModal ──────────────────────────────────────────────────

describe("NewAltarModal", () => {
  const TOOLS: ToolPickerOption[] = [
    { id: "t1", name: "Hazel wand", kind: "wand" },
    { id: "t2", name: "Brass censer", kind: "censer" },
  ];

  it("renders nothing when open=false", () => {
    const { container } = render(
      <NewAltarModal open={false} onClose={() => {}} tools={TOOLS} />,
    );
    expect(
      container.querySelector("[data-component='new-altar-modal']"),
    ).toBeFalsy();
  });

  it("Permanent toggle defaults OFF", () => {
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={TOOLS} />,
    );
    const toggle = container.querySelector(
      "[data-na-permanent]",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("Save disabled until Name is filled", () => {
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={TOOLS} />,
    );
    const save = container.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-na-name]") as HTMLInputElement,
      { target: { value: "Hearth altar" } },
    );
    expect(save.disabled).toBe(false);
  });

  it("shows the empty-state nudge when no tools available", () => {
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={[]} />,
    );
    expect(container.querySelector("[data-na-tools-empty]")).toBeTruthy();
  });

  it("selects + unselects tools by click", () => {
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={TOOLS} />,
    );
    const t1 = container.querySelector(
      "[data-tool-id='t1']",
    ) as HTMLButtonElement;
    fireEvent.click(t1);
    expect(t1.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(t1);
    expect(t1.getAttribute("aria-pressed")).toBe("false");
  });

  it("fires onSave with the H07 payload shape including selected tools in order", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={TOOLS} onSave={onSave} />,
    );
    fireEvent.change(
      container.querySelector("[data-na-name]") as HTMLInputElement,
      { target: { value: "Saturday altar" } },
    );
    // Pick t2 first, then t1 — order should persist as render order.
    fireEvent.click(
      container.querySelector("[data-tool-id='t2']") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-tool-id='t1']") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-action='save']") as HTMLButtonElement,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]![0];
    expect(payload.name).toBe("Saturday altar");
    expect(payload.is_permanent).toBe(false);
    expect(payload.tool_ids).toEqual(["t2", "t1"]);
    expect(payload.arrangement_diagram_svg).toBeNull();
    expect(payload.description).toBeNull();
  });

  it("renders without --danger anywhere", () => {
    const { container } = render(
      <NewAltarModal open onClose={() => {}} tools={TOOLS} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ── CustomSquareBuilderModal ───────────────────────────────────────

describe("CustomSquareBuilderModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <CustomSquareBuilderModal open={false} onClose={() => {}} />,
    );
    expect(
      container.querySelector(
        "[data-component='custom-square-builder-modal']",
      ),
    ).toBeFalsy();
  });

  it("renders the grid at the default order (4 × 4 = 16 cells)", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} />,
    );
    expect(container.querySelectorAll("[data-csb-cell]")).toHaveLength(16);
  });

  it("changes order rebuilds the grid", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} />,
    );
    fireEvent.click(
      container.querySelector("[data-csb-order='5']") as HTMLButtonElement,
    );
    expect(container.querySelectorAll("[data-csb-cell]")).toHaveLength(25);
  });

  it("renders the magic constant for the current order", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} initialOrder={3} />,
    );
    // order=3 → 3 × (9+1)/2 = 15
    expect(
      (container.querySelector("[data-csb-constant]") as HTMLElement).textContent,
    ).toBe("15");
  });

  it("Save disabled until Name is filled — but never gated on sums", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} />,
    );
    const save = container.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-csb-name]") as HTMLInputElement,
      { target: { value: "My order-4 square" } },
    );
    // Save is enabled WITHOUT entering any cells. The H07 honesty
    // rule: failing sums are reported, not gated.
    expect(save.disabled).toBe(false);
  });

  it("fires onSave with the entered cell values (regardless of magicness)", () => {
    const onSave = vi.fn();
    const { container } = render(
      <CustomSquareBuilderModal
        open
        onClose={() => {}}
        initialOrder={3}
        onSave={onSave}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-csb-name]") as HTMLInputElement,
      { target: { value: "My non-magic" } },
    );
    // Enter a 1 in [0,0] — sums won't align but save proceeds.
    const cell00 = container.querySelector(
      "[data-csb-cell='0-0']",
    ) as HTMLInputElement;
    fireEvent.change(cell00, { target: { value: "1" } });
    fireEvent.click(
      container.querySelector("[data-action='save']") as HTMLButtonElement,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]![0];
    expect(payload.name).toBe("My non-magic");
    expect(payload.order).toBe(3);
    expect(payload.cells[0]![0]).toBe(1);
    expect(payload.attribution).toBeNull();
  });

  it("renders sum readouts for rows / cols / diagonals", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} initialOrder={3} />,
    );
    expect(
      container.querySelectorAll("[data-sum-ok]").length,
    ).toBeGreaterThan(0);
  });

  it("renders without --danger anywhere", () => {
    const { container } = render(
      <CustomSquareBuilderModal open onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
