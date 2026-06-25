/**
 * LinguisticTabs unit tests (H06 §S6 — Phase 08 cluster nav).
 *
 * Covers:
 *   • All 4 tabs render with the H06 labels in order
 *   • Active tab gets aria-current="page" + chart-1…4 colour
 *   • Default hrefFor returns the expected route per tab key
 *   • The component never emits red — no --danger anywhere
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  LINGUISTIC_DEFAULT_HREF_FOR,
  LINGUISTIC_TABS,
  LinguisticTabs,
} from "./LinguisticTabs.js";

describe("LinguisticTabs", () => {
  it("renders the four H06 tabs in the locked order", () => {
    const { container } = render(<LinguisticTabs />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(4);
    expect(Array.from(links).map((a) => a.textContent?.trim())).toEqual([
      "Calculator",
      "Cross-Journal Search",
      "Transliteration",
      "Voces Library",
    ]);
  });

  it("active tab carries aria-current=page", () => {
    const { container } = render(<LinguisticTabs active="search" />);
    const current = container.querySelector("[aria-current='page']");
    expect(current?.textContent).toContain("Cross-Journal Search");
  });

  it("default href map matches the four locked routes", () => {
    expect(LINGUISTIC_DEFAULT_HREF_FOR).toEqual({
      calc: "/gematria",
      search: "/gematria/search",
      translit: "/transliteration",
      voces: "/voces-library",
    });
  });

  it("renders without --danger anywhere — H06 forbids red in charts", () => {
    const { container } = render(<LinguisticTabs active="calc" />);
    const html = container.innerHTML;
    expect(html).not.toContain("--danger");
  });

  it("tab definitions use --chart-1..4 hue tokens", () => {
    const tokens = LINGUISTIC_TABS.map((t) => t.iconToken);
    expect(tokens).toEqual([
      "--chart-1",
      "--chart-2",
      "--chart-3",
      "--chart-4",
    ]);
  });
});
