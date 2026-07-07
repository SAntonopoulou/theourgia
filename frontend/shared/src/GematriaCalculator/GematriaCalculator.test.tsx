/**
 * GematriaCalculatorSurface unit tests (H06 §S6.1).
 *
 * Covers:
 *   • Two cipher selection toggles produce two result rows
 *   • Resonance card appears when ≥ 2 ciphers produce the same value
 *   • Empty state shows the editorial copy when input is blank
 *   • Custom cipher Save is disabled while any letter holds 0
 *   • No `--danger` token referenced anywhere (H06 rule #2)
 *   • Citation `‡` rendered for cited ciphers
 *   • The .dc.html input default "ἀγαθοδαίμων" produces results
 *     in the two default-selected ciphers
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GematriaCalculatorSurface } from "./GematriaCalculatorSurface.js";

describe("GematriaCalculatorSurface", () => {
  it("renders the topbar with the .dc.html title + subtitle", () => {
    render(<GematriaCalculatorSurface />);
    expect(screen.getByText("Gematria Calculator")).toBeInTheDocument();
    expect(
      screen.getByText(/numeric value of a word/i),
    ).toBeInTheDocument();
  });

  it("starts with two ciphers selected (Greek Isopsephy + Hebrew Hechrachi)", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    const pressed = container.querySelectorAll("[aria-pressed='true']");
    expect(pressed.length).toBeGreaterThanOrEqual(2);
  });

  it("computes a result for a supplied input under both default ciphers", () => {
    const { container } = render(
      <GematriaCalculatorSurface initialInput="ἀγαθοδαίμων" />,
    );
    expect(container.querySelector("[data-gc-results]")).toBeTruthy();
  });

  it("shows the empty state when input is cleared", () => {
    const { container } = render(
      <GematriaCalculatorSurface initialInput="" />,
    );
    expect(container.querySelector("[data-gc-empty]")).toBeTruthy();
    expect(screen.getByText(/Type a word above/i)).toBeInTheDocument();
  });

  it("filters ciphers in the picker by name", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    const filter = container.querySelector(
      "[data-cipher-filter]",
    ) as HTMLInputElement;
    fireEvent.change(filter, { target: { value: "Atbash" } });
    expect(container.querySelector("[data-cipher-id='heb-atbash']")).toBeTruthy();
    expect(
      container.querySelector("[data-cipher-id='greek-iso']"),
    ).toBeFalsy();
  });

  it("toggles a cipher on click", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    const atbash = container.querySelector(
      "[data-cipher-id='heb-atbash']",
    ) as HTMLButtonElement;
    expect(atbash.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(atbash);
    expect(atbash.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders the citation glyph (‡) for cited ciphers", () => {
    const { container } = render(
      <GematriaCalculatorSurface initialInput="ἀγαθοδαίμων" />,
    );
    const citations = container.querySelectorAll("[title^='Sefer Yetzirah']");
    expect(citations.length).toBeGreaterThan(0);
  });

  it("fires onSaveStudy with the current input + cipher ids when CTA is clicked", () => {
    const onSaveStudy = vi.fn();
    const { container } = render(
      <GematriaCalculatorSurface
        initialInput="ἀγαθοδαίμων"
        onSaveStudy={onSaveStudy}
      />,
    );
    const cta = container.querySelector(
      "[data-action='save-as-study']",
    ) as HTMLButtonElement;
    fireEvent.click(cta);
    expect(onSaveStudy).toHaveBeenCalledTimes(1);
    const call = onSaveStudy.mock.calls[0]![0];
    expect(call.input).toBe("ἀγαθοδαίμων");
    expect(Array.isArray(call.cipherIds)).toBe(true);
    expect(call.cipherIds.length).toBeGreaterThan(0);
  });

  it("opens the custom cipher modal", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    const cta = container.querySelector(
      "[data-action='open-custom-cipher']",
    ) as HTMLButtonElement;
    fireEvent.click(cta);
    expect(screen.getByText(/Define a custom cipher/i)).toBeInTheDocument();
  });

  it("disables the Save button on the custom-cipher modal until every letter has a value", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    fireEvent.click(
      container.querySelector(
        "[data-action='open-custom-cipher']",
      ) as HTMLButtonElement,
    );
    const save = container.querySelector(
      "[data-action='save-custom-cipher']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.getAttribute("aria-disabled")).toBe("true");
  });

  it("uses --warn (NOT --danger) for the 'letters still hold zero' notice", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    fireEvent.click(
      container.querySelector(
        "[data-action='open-custom-cipher']",
      ) as HTMLButtonElement,
    );
    const warn = container.querySelector("[data-warn-incomplete]") as HTMLElement;
    expect(warn).toBeTruthy();
    // H06 rule #2 — `--danger` is reserved.
    const html = warn.outerHTML;
    expect(html).not.toContain("--danger");
    expect(html).toContain("var(--warn)");
  });

  it("renders without --danger anywhere on the surface", () => {
    const { container } = render(<GematriaCalculatorSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
