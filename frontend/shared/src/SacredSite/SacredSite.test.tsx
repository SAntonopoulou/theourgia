/**
 * SacredSiteSurface tests (H07 §S3 surface 19).
 *
 * Honesty + H07 rule coverage:
 *   - Re-quantize panel uses --warn / --warn-soft / --warn-border
 *     (NEVER --danger)
 *   - Re-quantize options can only go LOWER than stored precision
 *   - Coordinate label appends quantize annotation only when
 *     stored precision is coarser than exact
 *   - Close icon uses --line + --ink-mute (never --danger)
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type SacredSiteRecord,
  SacredSiteSurface,
} from "./index.js";

const RECORD: SacredSiteRecord = {
  id: "tainaron",
  name: "Cape Tainaron",
  kind: "pilgrimage",
  stored_precision: "1km",
  coord_label: "36.39° N, 22.48° E",
  story:
    "The southernmost point of the Mani — the ancients held it for one of the mouths of the underworld.",
  linked_workings: [
    { id: "w1", title: "Descent at Tainaron", date_label: "21 Sep 2025" },
    {
      id: "w2",
      title: "Offering at the waterline",
      date_label: "21 Sep 2025",
    },
  ],
  linked_media: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
};

describe("SacredSiteSurface", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <SacredSiteSurface
        open={false}
        record={RECORD}
        onClose={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the heading + kind + stored-precision chips", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    expect(container.textContent).toContain("Cape Tainaron");
    const kindChip = container.querySelector(
      "[data-site-kind-chip]",
    ) as HTMLElement;
    expect(kindChip.textContent).toBe("Pilgrimage");
    const precChip = container.querySelector(
      "[data-site-precision-chip]",
    ) as HTMLElement;
    expect(precChip.textContent).toBe("Stored as ~1 km");
  });

  it("coordinate label appends quantize annotation when stored coarser than exact", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    const coord = container.querySelector(
      "[data-site-coord]",
    ) as HTMLElement;
    expect(coord.textContent).toContain("36.39° N, 22.48° E");
    expect(coord.textContent).toContain("quantized to ~1 km");
  });

  it("coordinate label has NO quantize annotation when stored exact", () => {
    const { container } = render(
      <SacredSiteSurface
        open
        record={{ ...RECORD, stored_precision: "exact" }}
        onClose={() => {}}
      />,
    );
    const coord = container.querySelector(
      "[data-site-coord]",
    ) as HTMLElement;
    expect(coord.textContent).not.toContain("quantized");
  });

  it("Linked workings render with date labels + fire onSelectWorking", () => {
    const onSelectWorking = vi.fn();
    const { container } = render(
      <SacredSiteSurface
        open
        record={RECORD}
        onClose={() => {}}
        onSelectWorking={onSelectWorking}
      />,
    );
    expect(container.textContent).toContain("Descent at Tainaron");
    expect(container.textContent).toContain("21 Sep 2025");
    fireEvent.click(
      container.querySelector("[data-linked-working='w1']") as HTMLElement,
    );
    expect(onSelectWorking).toHaveBeenCalledWith("w1");
  });

  it("Re-quantize toggle reveals the panel; panel uses --warn-* (never --danger)", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    expect(container.querySelector("[data-requantize-panel]")).toBeFalsy();
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    const panel = container.querySelector(
      "[data-requantize-panel]",
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.outerHTML).toContain("var(--warn-border)");
    expect(panel.style.background).toBe("var(--warn-soft)");
    expect(panel.innerHTML).not.toContain("--danger");
  });

  it("Re-quantize warning copy is verbatim", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    const warn = container.querySelector(
      "[data-requantize-warn]",
    ) as HTMLElement;
    expect(warn.style.color).toBe("var(--warn)");
    expect(warn.textContent).toContain(
      "Lowering precision is irreversible",
    );
    expect(warn.textContent).toContain(
      "You cannot raise precision you no longer hold",
    );
  });

  it("options ABOVE the stored precision are DISABLED (cannot raise)", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    const exactRow = container.querySelector(
      "[data-requantize-option='exact']",
    ) as HTMLElement;
    const km1Row = container.querySelector(
      "[data-requantize-option='1km']",
    ) as HTMLElement;
    const km10Row = container.querySelector(
      "[data-requantize-option='10km']",
    ) as HTMLElement;
    expect(exactRow.getAttribute("data-disabled")).toBe("true");
    expect(km1Row.getAttribute("data-disabled")).toBe("true");
    expect(km10Row.getAttribute("data-disabled")).toBe("false");
  });

  it("Re-quantize Apply fires onRequantize with the chosen lower precision", () => {
    const onRequantize = vi.fn();
    const { container } = render(
      <SacredSiteSurface
        open
        record={RECORD}
        onClose={() => {}}
        onRequantize={onRequantize}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-option='10km'] input[type='radio']",
      ) as HTMLInputElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-apply]",
      ) as HTMLButtonElement,
    );
    expect(onRequantize).toHaveBeenCalledWith("10km");
  });

  it("Apply button stays disabled until a lower option is selected", () => {
    const onRequantize = vi.fn();
    const { container } = render(
      <SacredSiteSurface
        open
        record={RECORD}
        onClose={() => {}}
        onRequantize={onRequantize}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    const apply = container.querySelector(
      "[data-requantize-apply]",
    ) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    // Click apply anyway — nothing should fire.
    fireEvent.click(apply);
    expect(onRequantize).not.toHaveBeenCalled();
  });

  it("Close icon uses --line ring + --ink-mute (not --danger)", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={onClose} />,
    );
    const close = container.querySelector(
      "[data-site-close]",
    ) as HTMLButtonElement;
    expect(close.outerHTML).toContain("var(--line)");
    expect(close.style.color).toBe("var(--ink-mute)");
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });

  it("never references --danger anywhere — closed panel", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("never references --danger anywhere — open requantize panel", () => {
    const { container } = render(
      <SacredSiteSurface open record={RECORD} onClose={() => {}} />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-requantize-toggle]",
      ) as HTMLButtonElement,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
