/**
 * SynchronicityQuickCaptureModal tests (H06 §S7.10).
 *
 * Honesty + H06 rule coverage:
 *   - Intensity defaults to 5 (the middle), never 10
 *   - Capture disabled until description has text
 *   - Capture forwards the full payload with category + intensity +
 *     structured + linked-* arrays bucketed by chip.kind
 *   - Cancel + Close + Escape all dismiss without --danger styling
 *   - Per-category structured field appears only for the relevant
 *     categories
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type SuggestedContextChip,
  SynchronicityQuickCaptureModal,
} from "./index.js";

const CONTEXT_CHIPS: SuggestedContextChip[] = [
  { id: "e1", label: "Last entry: Dark moon offering", kind: "entry" },
  { id: "ent1", label: "Hekate", kind: "entity" },
  { id: "w1", label: "Recent working: Banishing", kind: "working" },
];

describe("SynchronicityQuickCaptureModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open={false}
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the dialog with description + category radiogroup", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(container.querySelector("[data-description]")).toBeTruthy();
    expect(
      container.querySelectorAll("[data-category]").length,
    ).toBeGreaterThan(8);
  });

  it("intensity defaults to 5 (the middle), never 10", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    const slider = container.querySelector(
      "[data-intensity-slider]",
    ) as HTMLInputElement;
    expect(slider.value).toBe("5");
  });

  it("capture button disabled until description is non-empty", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    const cap = container.querySelector(
      "[data-capture]",
    ) as HTMLButtonElement;
    expect(cap.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-description]") as HTMLTextAreaElement,
      { target: { value: "1111 again" } },
    );
    expect(cap.disabled).toBe(false);
  });

  it("number_sequence category shows the Number structured field", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(container.querySelector("[data-structured-field]")).toBeTruthy();
    expect(container.textContent).toContain("Number");
  });

  it("dream_spillover hides the structured field", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-category='dream_spillover']",
      ) as HTMLButtonElement,
    );
    expect(container.querySelector("[data-structured-field]")).toBeFalsy();
  });

  it("Capture fires onCapture with the assembled payload", () => {
    const onCapture = vi.fn();
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        suggested_context={CONTEXT_CHIPS}
        onClose={() => {}}
        onCapture={onCapture}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-description]") as HTMLTextAreaElement,
      { target: { value: "1111 again" } },
    );
    fireEvent.change(
      container.querySelector(
        "[data-structured-input]",
      ) as HTMLInputElement,
      { target: { value: "1111" } },
    );
    fireEvent.change(
      container.querySelector(
        "[data-intensity-slider]",
      ) as HTMLInputElement,
      { target: { value: "7" } },
    );
    fireEvent.click(
      container.querySelector(
        "[data-context-chip='ent1']",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-capture]") as HTMLButtonElement,
    );
    expect(onCapture).toHaveBeenCalledWith({
      description: "1111 again",
      category: "number_sequence",
      intensity: 7,
      structured_data: { number: "1111" },
      linked_entry_ids: [],
      linked_entity_ids: ["ent1"],
      linked_working_ids: [],
    });
  });

  it("Capture splits suggested-context chips into the right linked-* arrays", () => {
    const onCapture = vi.fn();
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        suggested_context={CONTEXT_CHIPS}
        onClose={() => {}}
        onCapture={onCapture}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-description]") as HTMLTextAreaElement,
      { target: { value: "test" } },
    );
    // Activate all three chips
    fireEvent.click(
      container.querySelector(
        "[data-context-chip='e1']",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-context-chip='ent1']",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-context-chip='w1']",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-capture]") as HTMLButtonElement,
    );
    const payload = onCapture.mock.calls[0]?.[0];
    expect(payload.linked_entry_ids).toEqual(["e1"]);
    expect(payload.linked_entity_ids).toEqual(["ent1"]);
    expect(payload.linked_working_ids).toEqual(["w1"]);
  });

  it("Cancel button + Close icon both fire onClose without --danger", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={onClose}
        onCapture={() => {}}
      />,
    );
    const cancel = container.querySelector(
      "[data-cancel]",
    ) as HTMLButtonElement;
    const close = container.querySelector(
      "[data-close]",
    ) as HTMLButtonElement;
    expect(cancel.outerHTML).not.toContain("--danger");
    expect(close.outerHTML).not.toContain("--danger");
    fireEvent.click(cancel);
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("context label renders when supplied", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        context_label="Now · 14:32 · ☉ Sun in Aries · Hour of Venus"
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    const ctx = container.querySelector(
      "[data-context-label]",
    ) as HTMLElement;
    expect(ctx).toBeTruthy();
    expect(ctx.textContent).toContain("Sun in Aries");
    expect(ctx.textContent).toContain("Hour of Venus");
  });

  it("Details expander reveals the per-page-edit hint", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(container.querySelector("[data-details-panel]")).toBeFalsy();
    fireEvent.click(
      container.querySelector(
        "[data-details-toggle]",
      ) as HTMLButtonElement,
    );
    const panel = container.querySelector(
      "[data-details-panel]",
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain(
      "Full detail editing is on the Synchronicity Log page",
    );
  });

  it("Cmd/Ctrl + Enter inside the description fires Capture", () => {
    const onCapture = vi.fn();
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        onClose={() => {}}
        onCapture={onCapture}
      />,
    );
    const ta = container.querySelector(
      "[data-description]",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "fast capture" } });
    fireEvent.keyDown(ta, { key: "Enter", ctrlKey: true });
    expect(onCapture).toHaveBeenCalled();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <SynchronicityQuickCaptureModal
        open
        suggested_context={CONTEXT_CHIPS}
        onClose={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
