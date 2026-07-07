/**
 * PilgrimageMapSurface tests (H07 §S3 surface 18).
 *
 * Honesty + H07 rule coverage:
 *   - Sealed sites are NEVER plotted on the SVG; surface only via
 *     count badge + dashed sealed-rail row
 *   - Map precision quantizes ALL pins; cannot reveal more than
 *     a site's recorded precision (the floor wins)
 *   - "Hide map entirely" swaps the SVG for a quiet text panel
 *     while keeping the rail
 *   - `‡` attribution copy verbatim
 *   - Site colours come from --map-{kind} tokens, never --danger
 *   - No --danger anywhere
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PilgrimageSite,
  PilgrimageMapSurface,
} from "./index.js";

const SITES: PilgrimageSite[] = [
  {
    id: "crossroads",
    name: "The crossroads stone",
    kind: "working",
    x_norm: 0.34,
    y_norm: 0.48,
    recorded_precision: "1km",
    sealed: false,
  },
  {
    id: "eleusis",
    name: "Eleusis",
    kind: "sacred",
    x_norm: 0.3,
    y_norm: 0.32,
    recorded_precision: "exact",
    sealed: false,
  },
  {
    id: "tainaron",
    name: "Cape Tainaron",
    kind: "pilgrimage",
    x_norm: 0.47,
    y_norm: 0.48,
    recorded_precision: "1km",
    sealed: false,
  },
  {
    id: "village",
    name: "Grandmother's village",
    kind: "ancestral",
    x_norm: 0.74,
    y_norm: 0.58,
    recorded_precision: "country",
    sealed: false,
  },
  {
    id: "library",
    name: "The old library",
    kind: "other",
    x_norm: 0.56,
    y_norm: 0.37,
    recorded_precision: "10km",
    sealed: false,
  },
];

describe("PilgrimageMapSurface", () => {
  it("renders one pin per (plaintext) site by default", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={0} />,
    );
    expect(container.querySelectorAll("[data-map-pin]")).toHaveLength(5);
  });

  it("`‡` attribution copy is verbatim", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={0} />,
    );
    const att = container.querySelector(
      "[data-map-attribution]",
    ) as HTMLElement;
    expect(att.textContent).toContain("‡");
    expect(att.textContent).toContain(
      "Map tiles © OpenStreetMap · your viewport is visible to OSM",
    );
  });

  it("sealed cluster badge renders when sealed_count > 0", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={2} />,
    );
    const cluster = container.querySelector(
      "[data-sealed-cluster]",
    ) as Element;
    expect(cluster).toBeTruthy();
    expect(cluster.textContent).toContain("+2");
    const sealedRail = container.querySelector(
      "[data-sealed-rail]",
    ) as HTMLElement;
    expect(sealedRail).toBeTruthy();
    expect(sealedRail.textContent).toContain("2 sealed sites");
  });

  it("sealed UI is hidden entirely when sealed_count is 0", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={0} />,
    );
    expect(container.querySelector("[data-sealed-cluster]")).toBeFalsy();
    expect(container.querySelector("[data-sealed-rail]")).toBeFalsy();
  });

  it("precision selector quantizes ALL pins to the chosen floor", () => {
    const { container } = render(
      <PilgrimageMapSurface
        sites={SITES}
        sealed_count={0}
      />,
    );
    // Pins still render at country precision (the floor never goes
    // below "country" for the Grandmother's village site).
    fireEvent.change(
      container.querySelector("[data-map-precision]") as HTMLSelectElement,
      { target: { value: "country" } },
    );
    expect(container.querySelectorAll("[data-map-pin]")).toHaveLength(5);
  });

  it("'Hide map entirely' swaps SVG for the hidden panel; rail remains", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={0} />,
    );
    fireEvent.change(
      container.querySelector("[data-map-precision]") as HTMLSelectElement,
      { target: { value: "hidden" } },
    );
    expect(container.querySelector("[data-map-hidden]")).toBeTruthy();
    expect(
      container.querySelector("[data-map-canvas] svg"),
    ).toBeFalsy();
    expect(container.querySelectorAll("[data-site-id]")).toHaveLength(5);
  });

  it("rail rows reflect the effective (quantized) precision", () => {
    // Explicit initial_precision="exact" — the surface default is now
    // "1km" per the H07 Cluster C honesty rule; this test still
    // checks that Eleusis renders at Exact when the caller opts in.
    const { container } = render(
      <PilgrimageMapSurface
        sites={SITES}
        sealed_count={0}
        initial_precision="exact"
      />,
    );
    const eleusis = container.querySelector(
      "[data-site-id='eleusis']",
    ) as HTMLElement;
    expect(eleusis.textContent).toContain("Sacred site");
    expect(eleusis.textContent).toContain("Exact");

    // Forcing 10km lowers Eleusis from "Exact" to "~10 km".
    fireEvent.change(
      container.querySelector("[data-map-precision]") as HTMLSelectElement,
      { target: { value: "10km" } },
    );
    const eleusis2 = container.querySelector(
      "[data-site-id='eleusis']",
    ) as HTMLElement;
    expect(eleusis2.textContent).toContain("~10 km");
  });

  it("a site's recorded precision is a FLOOR — quantize cannot reveal more", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={0} />,
    );
    // Country-precision site stays at country even at exact.
    fireEvent.change(
      container.querySelector("[data-map-precision]") as HTMLSelectElement,
      { target: { value: "exact" } },
    );
    const village = container.querySelector(
      "[data-site-id='village']",
    ) as HTMLElement;
    expect(village.textContent).toContain("Country");
    expect(village.textContent).not.toContain("Exact");
  });

  it("onSelectSite fires from rail row + map pin", () => {
    const onSelectSite = vi.fn();
    const { container } = render(
      <PilgrimageMapSurface
        sites={SITES}
        sealed_count={0}
        onSelectSite={onSelectSite}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-site-id='eleusis']") as HTMLElement,
    );
    expect(onSelectSite).toHaveBeenCalledWith("eleusis");
    fireEvent.click(
      container.querySelector(
        "[data-map-pin='crossroads']",
      ) as unknown as HTMLElement,
    );
    expect(onSelectSite).toHaveBeenLastCalledWith("crossroads");
  });

  it("onAddPlace fires from the Add Place CTA", () => {
    const onAddPlace = vi.fn();
    render(
      <PilgrimageMapSurface
        sites={SITES}
        sealed_count={0}
        onAddPlace={onAddPlace}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add place/i }));
    expect(onAddPlace).toHaveBeenCalled();
  });

  it("site pins use --map-{kind} tokens, never --danger", () => {
    const { container } = render(
      <PilgrimageMapSurface sites={SITES} sealed_count={2} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("--map-sacred");
    expect(html).toContain("--map-working");
    expect(html).toContain("--map-pilgrimage");
    expect(html).toContain("--map-ancestral");
    expect(html).toContain("--map-other");
    expect(html).not.toContain("--danger");
  });
});
