/**
 * AddPlaceModal tests (H07 §S3 surface 20).
 *
 * Honesty + H07 rule coverage:
 *   - Default precision is "~1 km" — NOT "Exact"
 *   - Precision footnote copy verbatim
 *   - Nominatim attribution uses `‡` glyph + verbatim copy
 *   - Seal default OFF; seal description copy verbatim
 *   - Save button disabled until Name is non-empty
 *   - "I don't want exact location" snaps precision to country
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddPlaceModal } from "./index.js";

describe("AddPlaceModal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <AddPlaceModal open={false} onClose={() => {}} onSave={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("default precision is ~1 km (NOT exact)", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const km1 = container.querySelector(
      "[data-add-place-prec='1km']",
    ) as HTMLButtonElement;
    expect(km1.getAttribute("aria-checked")).toBe("true");
    const exact = container.querySelector(
      "[data-add-place-prec='exact']",
    ) as HTMLButtonElement;
    expect(exact.getAttribute("aria-checked")).toBe("false");
  });

  it("precision footnote copy is verbatim", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const note = container.querySelector(
      "[data-add-place-prec-note]",
    ) as HTMLElement;
    expect(note.textContent).toContain(
      "The default is ~1 km, not exact.",
    );
    expect(note.textContent).toContain(
      "Recorded precision affects how this place is shown to you AND in any exports.",
    );
  });

  it("Nominatim note uses `‡` glyph + verbatim copy", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const note = container.querySelector(
      "[data-add-place-nominatim-note]",
    ) as HTMLElement;
    expect(note.textContent).toContain("‡");
    expect(note.textContent).toContain(
      "Search is provided by Nominatim (OpenStreetMap). Your query is visible to them.",
    );
  });

  it("Seal toggle defaults OFF", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const checkbox = container.querySelector(
      "[data-add-place-seal-toggle] input[type='checkbox']",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("Seal description copy is verbatim", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const seal = container.querySelector(
      "[data-add-place-seal-toggle]",
    ) as HTMLElement;
    expect(seal.textContent).toContain(
      "Encrypts the coordinates and story on this device only. The passphrase is never sent to the server.",
    );
  });

  it("Save is disabled until Name is non-empty", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const save = container.querySelector(
      "[data-add-place-save]",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(
      container.querySelector("[data-add-place-name]") as HTMLInputElement,
      { target: { value: "Cape Tainaron" } },
    );
    expect(save.disabled).toBe(false);
  });

  it("Save click fires onSave with the full draft", () => {
    const onSave = vi.fn();
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={onSave} />,
    );
    fireEvent.change(
      container.querySelector("[data-add-place-name]") as HTMLInputElement,
      { target: { value: "Cape Tainaron" } },
    );
    fireEvent.click(
      container.querySelector(
        "[data-add-place-kind='pilgrimage']",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-add-place-save]",
      ) as HTMLButtonElement,
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cape Tainaron",
        kind: "pilgrimage",
        precision: "1km",
        seal: false,
      }),
    );
  });

  it("'I don't want exact location' snaps precision to country", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const all = Array.from(
      container.querySelectorAll("[data-add-place-loc-option]"),
    );
    const target = all.find((el) =>
      (el.textContent ?? "").includes("I don't want exact location"),
    ) as HTMLButtonElement;
    expect(target).toBeTruthy();
    fireEvent.click(target);
    const country = container.querySelector(
      "[data-add-place-prec='country']",
    ) as HTMLButtonElement;
    expect(country.getAttribute("aria-checked")).toBe("true");
  });

  it("Cancel uses --line-2 + --ink-soft, never --danger", () => {
    const onClose = vi.fn();
    const { container } = render(
      <AddPlaceModal open onClose={onClose} onSave={() => {}} />,
    );
    const cancel = container.querySelector(
      "[data-add-place-cancel]",
    ) as HTMLButtonElement;
    expect(cancel.outerHTML).toContain("var(--line-2)");
    expect(cancel.style.color).toBe("var(--ink-soft)");
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalled();
  });

  it("Site-kind swatches use --map-{kind} colours", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("var(--map-sacred)");
    expect(html).toContain("var(--map-working)");
    expect(html).toContain("var(--map-pilgrimage)");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <AddPlaceModal open onClose={() => {}} onSave={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
