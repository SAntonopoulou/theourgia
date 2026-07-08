import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguagePalette } from "./LanguagePalette.js";
import { transliterateIast } from "./iastTransliterator.js";

describe("transliterateIast", () => {
  it("long vowels", () => {
    expect(transliterateIast("Rama")).toBe("Rama");
    expect(transliterateIast("Raama")).toBe("Rāma");
    expect(transliterateIast("Siitaa")).toBe("Sītā");
    expect(transliterateIast("guuruu")).toBe("gūrū");
  });

  it("retroflex + nasal", () => {
    expect(transliterateIast(".rgveda")).toBe("ṛgveda");
    expect(transliterateIast("Kri.s.na")).toBe("Kriṣṇa");
    expect(transliterateIast("Ga.nes'a")).toBe("Gaṇeśa");
    expect(transliterateIast("OM")).toBe("oṁ");
  });

  it("prefers longer patterns first", () => {
    // ".rr" beats ".r"+"r"
    expect(transliterateIast("kaa.rrtri")).toBe("kāṝtri");
  });

  it("passes non-matching sequences through unchanged", () => {
    expect(transliterateIast("hello world")).toBe("hello world");
    expect(transliterateIast("")).toBe("");
  });
});

describe("LanguagePalette", () => {
  it("renders Greek by default and lets the caller pick a starting script", () => {
    render(<LanguagePalette onInsert={vi.fn()} />);
    expect(
      screen.getByRole("tab", { name: /Greek/i, selected: true }),
    ).toBeInTheDocument();

    render(<LanguagePalette onInsert={vi.fn()} initialScript="iast" />);
    expect(
      screen.getByRole("tab", { name: /Sanskrit/i, selected: true }),
    ).toBeInTheDocument();
  });

  it("fires onInsert with the clicked character", async () => {
    const spy = vi.fn();
    render(<LanguagePalette onInsert={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /^Insert α$/ }));
    expect(spy).toHaveBeenCalledWith("α");
  });

  it("switches script tab on click", async () => {
    render(<LanguagePalette onInsert={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: /Hebrew/i }));
    // Hebrew alef is in the palette.
    expect(screen.getByRole("button", { name: /^Insert א$/ })).toBeInTheDocument();
  });
});
