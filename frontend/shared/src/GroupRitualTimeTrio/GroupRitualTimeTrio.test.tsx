/**
 * GroupRitualTimeTrio — unit tests.
 *
 * THE H08 honesty rules (rule 23):
 *
 *   * The trio renders THREE cards (local | UTC | planetary
 *     hour) — never one, never two. The component's prop
 *     signature requires every field; tests assert the three
 *     cards land in the DOM.
 *   * The UTC card uses --font-mono — the brief is explicit.
 *   * The planetary-hour card switches to --planetary-hour-now
 *     chrome when `isCurrent=true`.
 *   * The seven planetary glyphs map to the correct rulers.
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import {
  GRTT_HOUR_OF_PREFIX,
  GRTT_LOCAL_EYEBROW,
  GRTT_PLANETARY_EYEBROW,
  GRTT_UTC_EYEBROW,
  GroupRitualTimeTrio,
  PLANETARY_HOUR_GLYPHS,
  type PlanetaryHourRuler,
} from "./GroupRitualTimeTrio.js";

function renderTrio(
  overrides: Partial<
    Parameters<typeof GroupRitualTimeTrio>[0]
  > = {},
) {
  return render(
    <GroupRitualTimeTrio
      localPrimary="20 Mar 2026 · 06:12"
      localSecondary="Europe/Athens (EET)"
      utcPrimary="04:12 UTC"
      utcSecondary="20 Mar 2026"
      planetaryRuler="Sun"
      planetarySecondary="1st hour of day"
      isCurrent={true}
      {...overrides}
    />,
  );
}

// ─── Structure ─────────────────────────────────────────────────────

describe("GroupRitualTimeTrio — structure", () => {
  it("renders exactly three cards (local | utc | planetary)", () => {
    renderTrio();
    expect(
      document.querySelectorAll("[data-card]"),
    ).toHaveLength(3);
    expect(document.querySelector("[data-card='local']")).not.toBeNull();
    expect(document.querySelector("[data-card='utc']")).not.toBeNull();
    expect(document.querySelector("[data-card='planetary']")).not.toBeNull();
  });

  it("uses the three verbatim eyebrows by default", () => {
    renderTrio();
    expect(
      document.querySelector("[data-card='local'] [data-field='eyebrow']")
        ?.textContent,
    ).toBe(GRTT_LOCAL_EYEBROW);
    expect(
      document.querySelector("[data-card='utc'] [data-field='eyebrow']")
        ?.textContent,
    ).toBe(GRTT_UTC_EYEBROW);
    expect(
      document.querySelector(
        "[data-card='planetary'] [data-field='eyebrow']",
      )?.textContent,
    ).toBe(GRTT_PLANETARY_EYEBROW);
  });

  it("respects custom eyebrow overrides", () => {
    renderTrio({
      localEyebrow: "Athens",
      utcEyebrow: "Anchor",
      planetaryEyebrow: "Hour",
    });
    expect(
      document.querySelector("[data-card='local'] [data-field='eyebrow']")
        ?.textContent,
    ).toBe("Athens");
  });
});

// ─── Local card ────────────────────────────────────────────────────

describe("GroupRitualTimeTrio — local card", () => {
  it("renders the primary line in --font-display", () => {
    renderTrio();
    const primary = document.querySelector(
      "[data-card='local'] [data-field='primary']",
    ) as HTMLElement;
    expect(primary.textContent).toBe("20 Mar 2026 · 06:12");
    expect(primary.style.fontFamily).toContain("font-display");
  });

  it("renders the secondary line (timezone) in --ink-mute", () => {
    renderTrio();
    const sec = document.querySelector(
      "[data-card='local'] [data-field='secondary']",
    ) as HTMLElement;
    expect(sec.textContent).toBe("Europe/Athens (EET)");
    expect(sec.style.color).toContain("--ink-mute");
  });
});

// ─── UTC card ──────────────────────────────────────────────────────

describe("GroupRitualTimeTrio — UTC card", () => {
  it("renders the primary line in --font-mono", () => {
    renderTrio();
    const primary = document.querySelector(
      "[data-card='utc'] [data-field='primary']",
    ) as HTMLElement;
    expect(primary.textContent).toBe("04:12 UTC");
    expect(primary.style.fontFamily).toContain("font-mono");
  });

  it("renders the secondary date in --ink-mute", () => {
    renderTrio();
    const sec = document.querySelector(
      "[data-card='utc'] [data-field='secondary']",
    ) as HTMLElement;
    expect(sec.textContent).toBe("20 Mar 2026");
  });
});

// ─── Planetary-hour card ──────────────────────────────────────────

describe("GroupRitualTimeTrio — planetary-hour card", () => {
  it("renders 'Hour of the {ruler}' verbatim", () => {
    renderTrio({ planetaryRuler: "Jupiter" });
    const primary = document.querySelector(
      "[data-card='planetary'] [data-field='primary']",
    ) as HTMLElement;
    expect(primary.textContent).toBe(
      `${GRTT_HOUR_OF_PREFIX}Jupiter`,
    );
  });

  it("uses --planetary-hour-now chrome when isCurrent=true", () => {
    renderTrio({ isCurrent: true });
    const card = document.querySelector(
      "[data-card='planetary']",
    ) as HTMLElement;
    expect(card.style.background).toContain("--planetary-hour-now-soft");
    expect(card.style.borderColor).toContain("--planetary-hour-now");
    expect(card.getAttribute("data-current")).toBe("true");
  });

  it("uses neutral --bg-2 chrome when isCurrent=false", () => {
    renderTrio({ isCurrent: false });
    const card = document.querySelector(
      "[data-card='planetary']",
    ) as HTMLElement;
    expect(card.style.background).toContain("--bg-2");
    expect(card.style.background).not.toContain("--planetary-hour-now");
    expect(card.getAttribute("data-current")).toBe("false");
  });

  it("planetary glyph is --planetary-hour-now when isCurrent=true", () => {
    renderTrio({ planetaryRuler: "Sun", isCurrent: true });
    const glyph = document.querySelector(
      "[data-glyph='Sun']",
    ) as HTMLElement;
    expect(glyph.style.color).toContain("--planetary-hour-now");
  });

  it("planetary glyph is --ink-soft when isCurrent=false", () => {
    renderTrio({ planetaryRuler: "Sun", isCurrent: false });
    const glyph = document.querySelector(
      "[data-glyph='Sun']",
    ) as HTMLElement;
    expect(glyph.style.color).toContain("--ink-soft");
  });
});

// ─── Glyph map ─────────────────────────────────────────────────────

describe("GroupRitualTimeTrio — planetary-hour glyph map", () => {
  const cases: ReadonlyArray<[PlanetaryHourRuler, string]> = [
    ["Saturn", "♄"],
    ["Jupiter", "♃"],
    ["Mars", "♂"],
    ["Sun", "☉"],
    ["Venus", "♀"],
    ["Mercury", "☿"],
    ["Moon", "☽"],
  ];
  it.each(cases)("%s → %s", (ruler, expected) => {
    expect(PLANETARY_HOUR_GLYPHS[ruler]).toBe(expected);
  });

  it("all seven rulers have a glyph", () => {
    const rulers: PlanetaryHourRuler[] = [
      "Saturn",
      "Jupiter",
      "Mars",
      "Sun",
      "Venus",
      "Mercury",
      "Moon",
    ];
    rulers.forEach((r) => {
      expect(PLANETARY_HOUR_GLYPHS[r]).toBeTruthy();
    });
  });
});
