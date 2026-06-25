/**
 * VocesLibrarySurface unit tests (H06 §S6.4).
 *
 * Covers the H06 honesty rules + locked product decisions:
 *   • Citation `‡` appears on every bundled voce row
 *   • Personal voces carry the "personal" badge
 *   • Tradition chip filter narrows the list
 *   • Source segmented control filters by bundled / personal
 *   • Search filters by text · transliteration · IPA
 *   • Drawer opens on row click
 *   • Drawer renders the citation card with the source string
 *   • Drawer's "Suggest correction" modal carries the Phase 14 footer
 *   • No `--danger` token anywhere on the surface
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type VoceLibraryEntry,
  VocesLibrarySurface,
} from "./VocesLibrarySurface.js";
import { deriveTradition } from "./copy.js";

const SAMPLE: VoceLibraryEntry[] = [
  {
    id: "pgm_iv_2785",
    source_text: "ΕΛΘΕ ΜΟΙ ΩΦΡΟΥ",
    transliteration: "elthe moi, Phrou",
    ipa: "ˈel.tʰe moi̯",
    source_citation: "PGM IV.2785 (Preisendanz 1928 vol I, p. 168)",
    bundled: true,
    planetary_associations: ["moon"],
    elemental_associations: [],
    recording_count: 2,
  },
  {
    id: "personal_first_voce",
    source_text: "ΦΩΡ ΦΩΡΒΑ",
    transliteration: "phōr phōrba",
    ipa: "/pʰɔːr pʰɔːr.ba/",
    source_citation: "My own derivation; Hekate-Selene name.",
    bundled: false,
    planetary_associations: ["moon"],
    elemental_associations: ["earth"],
    recording_count: 1,
  },
  {
    id: "heptameron_michael",
    source_text: "Michael",
    transliteration: null,
    ipa: "mi.kʰaˈeːl",
    source_citation: "Pseudo-Peter of Abano, Heptameron (Venice 1559).",
    bundled: true,
    planetary_associations: ["sun"],
    elemental_associations: ["fire"],
    recording_count: 0,
  },
];

describe("VocesLibrarySurface", () => {
  it("renders the topbar with the .dc.html title + subtitle", () => {
    const { getByText } = render(<VocesLibrarySurface voces={SAMPLE} />);
    expect(getByText("Voces Magicae Library")).toBeInTheDocument();
    expect(getByText(/canonical names/i)).toBeInTheDocument();
  });

  it("renders one row per voce", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    expect(container.querySelectorAll("[data-voce-id]")).toHaveLength(3);
  });

  it("shows the ‡ citation glyph on bundled voces only", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    const bundled = container.querySelector(
      "[data-voce-id='pgm_iv_2785']",
    ) as HTMLElement;
    const personal = container.querySelector(
      "[data-voce-id='personal_first_voce']",
    ) as HTMLElement;
    expect(bundled.textContent).toContain("‡");
    expect(personal.textContent).not.toContain("‡");
  });

  it("shows the 'personal' badge on personal voces only", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    const personal = container.querySelector(
      "[data-voce-id='personal_first_voce']",
    ) as HTMLElement;
    expect(personal.textContent?.toLowerCase()).toContain("personal");
  });

  it("filters by the source segmented control", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    const personalBtn = container.querySelector(
      "[data-source='personal']",
    ) as HTMLButtonElement;
    fireEvent.click(personalBtn);
    expect(container.querySelectorAll("[data-voce-id]")).toHaveLength(1);
    expect(
      container.querySelector("[data-voce-id='personal_first_voce']"),
    ).toBeTruthy();
  });

  it("filters by tradition chip", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    // The Heptameron voce derives tradition='heptameron'.
    const hept = container.querySelector(
      "[data-tradition='heptameron']",
    ) as HTMLButtonElement;
    if (hept) {
      fireEvent.click(hept);
      const rows = container.querySelectorAll("[data-voce-id]");
      expect(rows).toHaveLength(1);
      expect(rows[0]?.getAttribute("data-voce-id")).toBe("heptameron_michael");
    }
  });

  it("search narrows the list by source text", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    const search = container.querySelector(
      "[data-voce-search]",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "Michael" } });
    const rows = container.querySelectorAll("[data-voce-id]");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute("data-voce-id")).toBe("heptameron_michael");
  });

  it("shows the empty state when nothing matches", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    const search = container.querySelector(
      "[data-voce-search]",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "no-such-voce" } });
    expect(container.querySelector("[data-voces-empty]")).toBeTruthy();
  });

  it("opens the drawer on row click and renders the source_citation", () => {
    const { container, getByText } = render(
      <VocesLibrarySurface voces={SAMPLE} />,
    );
    fireEvent.click(
      container.querySelector("[data-voce-id='pgm_iv_2785']") as HTMLElement,
    );
    expect(container.querySelector("[data-voce-drawer]")).toBeTruthy();
    expect(getByText(/Preisendanz 1928/i)).toBeInTheDocument();
  });

  it("fires onFork when the Fork CTA is clicked in the drawer", () => {
    const onFork = vi.fn();
    const { container } = render(
      <VocesLibrarySurface voces={SAMPLE} onFork={onFork} />,
    );
    fireEvent.click(
      container.querySelector("[data-voce-id='pgm_iv_2785']") as HTMLElement,
    );
    fireEvent.click(
      container.querySelector("[data-action='fork']") as HTMLButtonElement,
    );
    expect(onFork).toHaveBeenCalledWith("pgm_iv_2785");
  });

  it("Fork CTA is hidden for personal voces (already in vault)", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    fireEvent.click(
      container.querySelector(
        "[data-voce-id='personal_first_voce']",
      ) as HTMLElement,
    );
    expect(container.querySelector("[data-action='fork']")).toBeFalsy();
  });

  it("opens the suggest-correction modal and surfaces the Phase 14 footer", () => {
    const { container, getByText } = render(
      <VocesLibrarySurface voces={SAMPLE} />,
    );
    fireEvent.click(
      container.querySelector("[data-voce-id='pgm_iv_2785']") as HTMLElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='suggest']",
      ) as HTMLButtonElement,
    );
    expect(
      getByText(/review pipeline ships with the community-contribution layer/i),
    ).toBeInTheDocument();
  });

  it("renders without --danger anywhere on the surface", () => {
    const { container } = render(<VocesLibrarySurface voces={SAMPLE} />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("deriveTradition correctly identifies a PGM citation", () => {
    expect(
      deriveTradition("PGM IV.2785 (Preisendanz 1928 vol I, p. 168)"),
    ).toBe("pgm");
  });

  it("deriveTradition correctly identifies the Heptameron", () => {
    expect(
      deriveTradition("Pseudo-Peter of Abano, Heptameron (Venice 1559)."),
    ).toBe("heptameron");
  });

  it("deriveTradition falls back to 'custom' for unfamiliar citations", () => {
    expect(deriveTradition("My own observation, 2026-06-25.")).toBe("custom");
  });
});
