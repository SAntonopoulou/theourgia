/**
 * CrossJournalSearchSurface tests (H06 §S7.2).
 *
 * Honesty + H06 rule coverage:
 *   - Sealed block surfaces only the count + a quiet unlock CTA;
 *     phrases of sealed entries are never rendered
 *   - Personal-cipher matches carry a quiet --ink-mute disclaimer
 *   - Δ slider only visible on "near" mode
 *   - Reduced mode shows verbatim hint copy
 *   - Empty-query, loading, and no-match states render verbatim
 *   - Save / CSV / Unlock fire their handlers
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CrossJournalSearchSurface,
  type SearchCipher,
  type SearchResponse,
} from "./index.js";

const CIPHERS: SearchCipher[] = [
  { id: "c1", name: "Isopsephy", language: "greek", personal: false },
  { id: "c2", name: "Mispar Hechrachi", language: "hebrew", personal: false },
  { id: "c3", name: "My personal cipher", language: "custom", personal: true },
];

const RESPONSE: SearchResponse = {
  total_matches: 5,
  entries_with_matches: 3,
  results: [
    {
      entry_id: "e1",
      entry_title: "On the dark moon",
      entry_date: "2026-06-15T00:00:00Z",
      phrase: "σοφια",
      cipher_id: "c1",
      cipher_name: "Isopsephy",
      cipher_personal: false,
      value: 418,
      digit_sum: 4,
      is_sealed: false,
    },
    {
      entry_id: "e2",
      entry_title: "Crossroads working",
      entry_date: "2026-06-08T00:00:00Z",
      phrase: "the witness",
      cipher_id: "c3",
      cipher_name: "My personal cipher",
      cipher_personal: true,
      value: 418,
      digit_sum: 4,
      is_sealed: false,
    },
  ],
  sealed_match_count: 3,
  resonances: [
    {
      phrase: "σοφια",
      value: 418,
      ciphers: ["Isopsephy", "Mispar Hechrachi"],
    },
  ],
};

describe("CrossJournalSearchSurface", () => {
  it("renders the empty-query state when no value is entered", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={null}
        onSearch={() => {}}
      />,
    );
    const empty = container.querySelector(
      "[data-empty-query]",
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain(
      "Enter a value above.",
    );
  });

  it("fires onSearch when value is submitted via Enter", () => {
    const onSearch = vi.fn();
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={null}
        onSearch={onSearch}
      />,
    );
    const input = container.querySelector(
      "[data-value-input]",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "418" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSearch).toHaveBeenCalledWith({
      value: 418,
      cipher_ids: [],
      match_mode: "exact",
      delta: 0,
      include_personal_ciphers: false,
    });
  });

  it("Δ slider hidden by default; visible only on 'near' mode", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    expect(container.querySelector("[data-delta-row]")).toBeFalsy();
    fireEvent.click(
      container.querySelector(
        "[data-match-mode='near']",
      ) as HTMLButtonElement,
    );
    expect(container.querySelector("[data-delta-row]")).toBeTruthy();
  });

  it("reduced-mode hint copy is verbatim", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-match-mode='reduced']",
      ) as HTMLButtonElement,
    );
    const hint = container.querySelector(
      "[data-reduced-hint]",
    ) as HTMLElement;
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain(
      "Matches phrases whose digit-summed value equals your value's digit sum",
    );
  });

  it("Δ slider value forwards to onSearch", () => {
    const onSearch = vi.fn();
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={onSearch}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-value-input]") as HTMLInputElement,
      { target: { value: "418" } },
    );
    fireEvent.click(
      container.querySelector(
        "[data-match-mode='near']",
      ) as HTMLButtonElement,
    );
    fireEvent.change(
      container.querySelector("[data-delta-slider]") as HTMLInputElement,
      { target: { value: "3" } },
    );
    expect(onSearch).toHaveBeenLastCalledWith({
      value: 418,
      cipher_ids: [],
      match_mode: "near",
      delta: 3,
      include_personal_ciphers: false,
    });
  });

  it("renders result cards with cipher + value", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    const cards = container.querySelectorAll("[data-result-card]");
    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent).toContain("On the dark moon");
    expect(cards[0]?.textContent).toContain("418");
    expect(cards[0]?.textContent).toContain("Isopsephy");
  });

  it("flags personal-cipher matches with a quiet disclaimer", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    const flagged = container.querySelectorAll(
      "[data-cipher-personal='true']",
    );
    expect(flagged).toHaveLength(1);
    const flag = flagged[0]?.querySelector(
      "[data-personal-flag]",
    ) as HTMLElement;
    expect(flag).toBeTruthy();
    expect(flag.textContent).toContain(
      "via your personal cipher · not for shared studies",
    );
    expect(flag.style.color).toBe("var(--ink-mute)");
  });

  it("Sealed block is count-only — no sealed phrases rendered", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    const sealed = container.querySelector(
      "[data-sealed-block]",
    ) as HTMLElement;
    expect(sealed).toBeTruthy();
    expect(sealed.textContent).toContain("3 sealed entries match");
    expect(sealed.textContent).toContain(
      "The matched phrase isn't shown until you unlock.",
    );
    // No data-result-card with sealed=true should appear.
    expect(
      container.querySelector("[data-result-card][data-is-sealed='true']"),
    ).toBeFalsy();
  });

  it("Sealed block hidden when sealed_match_count is 0", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={{ ...RESPONSE, sealed_match_count: 0 }}
        onSearch={() => {}}
      />,
    );
    expect(container.querySelector("[data-sealed-block]")).toBeFalsy();
  });

  it("Unlock CTA fires onUnlockSealed", () => {
    const onUnlockSealed = vi.fn();
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
        onUnlockSealed={onUnlockSealed}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-unlock-sealed]",
      ) as HTMLButtonElement,
    );
    expect(onUnlockSealed).toHaveBeenCalled();
  });

  it("Save + CSV CTAs fire their handlers with the current payload", () => {
    const onSaveSearch = vi.fn();
    const onExportCsv = vi.fn();
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
        onSaveSearch={onSaveSearch}
        onExportCsv={onExportCsv}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-value-input]") as HTMLInputElement,
      { target: { value: "418" } },
    );
    fireEvent.click(
      container.querySelector("[data-save-search]") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-export-csv]") as HTMLButtonElement,
    );
    expect(onSaveSearch).toHaveBeenCalled();
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("Cipher picker toggles + selecting a cipher updates the button label", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={null}
        onSearch={() => {}}
      />,
    );
    const button = container.querySelector(
      "[data-cipher-picker]",
    ) as HTMLButtonElement;
    expect(button.textContent).toContain("All ciphers");
    fireEvent.click(button);
    expect(
      container.querySelector("[data-cipher-picker-panel]"),
    ).toBeTruthy();
    fireEvent.click(
      container.querySelector(
        "[data-cipher-option='c1'] input[type='checkbox']",
      ) as HTMLInputElement,
    );
    expect(button.textContent).toContain("Isopsephy");
  });

  it("renders the no-match state when total + sealed are both 0", () => {
    const empty: SearchResponse = {
      total_matches: 0,
      entries_with_matches: 0,
      results: [],
      sealed_match_count: 0,
      resonances: [],
    };
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={empty}
        onSearch={() => {}}
      />,
    );
    // Need a value entered for no-match to fire (otherwise empty-query
    // takes precedence).
    fireEvent.change(
      container.querySelector("[data-value-input]") as HTMLInputElement,
      { target: { value: "418" } },
    );
    const noMatch = container.querySelector(
      "[data-no-match]",
    ) as HTMLElement;
    expect(noMatch).toBeTruthy();
    expect(noMatch.textContent).toContain("No phrases in your journal");
    expect(noMatch.textContent).toContain("Try a wider Δ or a different cipher.");
  });

  it("renders the loading state", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={null}
        loading
        onSearch={() => {}}
      />,
    );
    expect(container.querySelector("[data-cjs-loading]")).toBeTruthy();
  });

  it("Resonance rail renders when there are results + resonances", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    const rail = container.querySelector(
      "[data-resonance-rail]",
    ) as HTMLElement;
    expect(rail).toBeTruthy();
    const rows = container.querySelectorAll("[data-resonance-row]");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain("σοφια");
    expect(rows[0]?.textContent).toContain("418");
    expect(rows[0]?.textContent).toContain("Isopsephy");
  });

  it("Resonance rail hidden when response has no resonances", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={{ ...RESPONSE, resonances: [] }}
        onSearch={() => {}}
      />,
    );
    expect(container.querySelector("[data-resonance-rail]")).toBeFalsy();
  });

  it("'Some recent entries may not yet be indexed' footnote renders", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    const notes = container.querySelectorAll(
      "[data-indexing-footnote]",
    );
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.textContent).toContain(
      "Some recent entries may not yet be indexed.",
    );
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <CrossJournalSearchSurface
        ciphers={CIPHERS}
        response={RESPONSE}
        onSearch={() => {}}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
