/**
 * TransliterationUtilitySurface tests (H06 §S7.6).
 *
 * Honesty + H06 rule coverage:
 *   - Round-trip status surfaces three distinct marks: ✓ var(--success)
 *     · ◐ var(--accent) · ✗ var(--ink-soft) — never --warn / --danger.
 *   - Lossy schemes show a quiet --warn loss note, never --danger.
 *   - Citation chip uses `‡` glyph + --accent.
 *   - "Characters outside the source script are passed through
 *     unchanged." copy verbatim.
 *   - Round-trip-check legend copy verbatim.
 *   - No --danger anywhere.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type SchemeOutput,
  type SourceScript,
  TransliterationUtilitySurface,
} from "./index.js";

const SCRIPTS: SourceScript[] = [
  "greek",
  "hebrew",
  "sanskrit",
  "arabic",
  "coptic",
];

const GREEK_SCHEMES: SchemeOutput[] = [
  {
    slug: "greek-beta-code",
    name: "Beta Code",
    citation: "Thesaurus Linguae Graecae project, UC Irvine. PD.",
    output: "a)gaqo\\s dai/mwn",
    round_trip_status: "lossless",
  },
  {
    slug: "greek-ala-lc",
    name: "ALA-LC",
    citation: "ALA/LC romanization 2010.",
    output: "agathos daimōn",
    round_trip_status: "normalises",
    loss_note: "Accents collapse for non-essential marks.",
  },
  {
    slug: "greek-monotonic",
    name: "Monotonic",
    citation: "Convention.",
    output: "agathos daimon",
    round_trip_status: "lossy",
    loss_note: "Accents are not represented in this scheme.",
  },
];

describe("TransliterationUtilitySurface", () => {
  it("renders header + script picker + source textarea + schemes rail", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς δαίμων"
        schemes={GREEK_SCHEMES}
      />,
    );
    expect(container.textContent).toContain("Transliteration");
    expect(container.querySelector("[data-script-picker]")).toBeTruthy();
    expect(container.querySelector("[data-source-input]")).toBeTruthy();
    expect(container.querySelector("[data-schemes-rail]")).toBeTruthy();
  });

  it("active script chip uses --accent-soft background", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text=""
        schemes={[]}
      />,
    );
    const greek = container.querySelector(
      "[data-script='greek']",
    ) as HTMLButtonElement;
    expect(greek.getAttribute("aria-pressed")).toBe("true");
    expect(greek.style.background).toBe("var(--accent-soft)");
  });

  it("clicking a script chip fires onScriptChange", () => {
    const onScriptChange = vi.fn();
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text=""
        schemes={[]}
        onScriptChange={onScriptChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-script='hebrew']") as HTMLButtonElement,
    );
    expect(onScriptChange).toHaveBeenCalledWith("hebrew");
  });

  it("Hebrew + Arabic textareas get dir=rtl", () => {
    const { container: c1 } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="hebrew"
        input_text="שלום"
        schemes={[]}
      />,
    );
    expect(
      (c1.querySelector("[data-source-input]") as HTMLElement).getAttribute(
        "dir",
      ),
    ).toBe("rtl");

    const { container: c2 } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="arabic"
        input_text="كتاب"
        schemes={[]}
      />,
    );
    expect(
      (c2.querySelector("[data-source-input]") as HTMLElement).getAttribute(
        "dir",
      ),
    ).toBe("rtl");
  });

  it("textarea onChange forwards to onInputChange", () => {
    const onInputChange = vi.fn();
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="αα"
        schemes={[]}
        onInputChange={onInputChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-source-input]") as HTMLTextAreaElement,
      { target: { value: "βββ" } },
    );
    expect(onInputChange).toHaveBeenCalledWith("βββ");
  });

  it("renders one scheme card per scheme", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    const cards = container.querySelectorAll("[data-scheme-card]");
    expect(cards).toHaveLength(3);
  });

  it("Round-trip marks: ✓ --success · ◐ --accent · ✗ --ink-soft (never --warn/--danger)", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    const lossless = container.querySelector(
      "[data-rt-mark='lossless']",
    ) as HTMLElement;
    expect(lossless.textContent).toBe("✓");
    expect(lossless.style.color).toBe("var(--success)");
    const normalises = container.querySelector(
      "[data-rt-mark='normalises']",
    ) as HTMLElement;
    expect(normalises.textContent).toBe("◐");
    expect(normalises.style.color).toBe("var(--accent)");
    const lossy = container.querySelector(
      "[data-rt-mark='lossy']",
    ) as HTMLElement;
    expect(lossy.textContent).toBe("✗");
    expect(lossy.style.color).toBe("var(--ink-soft)");
  });

  it("Loss notes use --warn (never --danger)", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    const notes = container.querySelectorAll("[data-loss-note]");
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach((n) => {
      expect((n as HTMLElement).style.color).toBe("var(--warn)");
    });
  });

  it("Citation chip uses `‡` glyph + --accent", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    const chips = container.querySelectorAll("[data-citation-chip]");
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((c) => {
      expect(c.textContent).toBe("‡");
      expect((c as HTMLElement).style.color).toBe("var(--accent)");
    });
  });

  it("Copy CTA fires onCopy + flashes 'Copied'", () => {
    const onCopy = vi.fn();
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
        onCopy={onCopy}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-copy='greek-beta-code']",
      ) as HTMLButtonElement,
    );
    expect(onCopy).toHaveBeenCalledWith(
      "greek-beta-code",
      "a)gaqo\\s dai/mwn",
    );
    expect(
      container.querySelector(
        "[data-scheme-card='greek-beta-code'] [data-copied-flash]",
      ),
    ).toBeTruthy();
  });

  it("Round-trip-check legend copy is verbatim", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    const legend = container.querySelector(
      "[data-round-trip-legend]",
    ) as HTMLElement;
    expect(legend.textContent).toContain(
      "Back-transliterates each scheme and compares against the original.",
    );
    expect(legend.textContent).toContain(
      "Informational, not a quality judgement.",
    );
  });

  it("Passthrough note copy is verbatim", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text=""
        schemes={[]}
      />,
    );
    const note = container.querySelector(
      "[data-passthrough-note]",
    ) as HTMLElement;
    expect(note.textContent).toContain(
      "Characters outside the source script are passed through unchanged.",
    );
  });

  it("Empty-schemes state renders when no scheme is available", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="latin"
        input_text="hello"
        schemes={[]}
      />,
    );
    expect(container.querySelector("[data-schemes-empty]")).toBeTruthy();
  });

  it("Round-trip check + Insert paragraph CTAs fire their handlers", () => {
    const onRoundTripCheck = vi.fn();
    const onInsertIntoDraft = vi.fn();
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
        onRoundTripCheck={onRoundTripCheck}
        onInsertIntoDraft={onInsertIntoDraft}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-round-trip]") as HTMLButtonElement,
    );
    expect(onRoundTripCheck).toHaveBeenCalled();
    fireEvent.click(
      container.querySelector(
        "[data-insert-paragraph]",
      ) as HTMLButtonElement,
    );
    expect(onInsertIntoDraft).toHaveBeenCalled();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <TransliterationUtilitySurface
        scripts={SCRIPTS}
        active_script="greek"
        input_text="ἀγαθὸς"
        schemes={GREEK_SCHEMES}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
