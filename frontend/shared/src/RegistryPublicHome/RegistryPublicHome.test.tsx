/**
 * RegistryPublicHome — H10 Cluster A1 tests.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { RegistryPublicHomeSurface } from "./RegistryPublicHomeSurface.js";

const EXTENSION_POINTS = [
  {
    name: "Divination systems",
    count: "7",
    desc: "New methods for the Divination workbench.",
  },
  {
    name: "Editor blocks",
    count: "14",
    desc: "Custom blocks for the entry editor.",
  },
];

const RECENTLY_UPDATED = [
  { name: "Geomancy Workbench", version: "v2.1.0", when: "2 days ago" },
  { name: "Decanic Faces", version: "v1.5.0", when: "4 days ago" },
];

const RECENTLY_ADDED = [
  {
    name: "Coptic Calendar",
    tier: "unverified" as const,
    when: "1 day ago",
  },
  {
    name: "Vedic Correspondences",
    tier: "community" as const,
    when: "5 days ago",
  },
];

describe("RegistryPublicHomeSurface", () => {
  test("renders the ‡ host citation chrome (rule 7)", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(
      screen.getByText(/‡ plugins\.theourgia\.com/),
    ).toBeInTheDocument();
  });

  test("renders the three trust-tier blocks", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(screen.getByText("Official")).toBeInTheDocument();
    // "Community" + "Unverified" appear in both the trust-tier block
    // AND the recently-added chips — assert presence, not uniqueness.
    expect(screen.getAllByText("Community").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unverified").length).toBeGreaterThanOrEqual(1);
  });

  test("Unverified tier body uses 'badge is a fact, not a warning'", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(
      screen.getByText(/the badge is a fact, not a warning/i),
    ).toBeInTheDocument();
  });

  test("renders extension-point tiles with counts (rule 9 — load-bearing for nav)", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(screen.getByText("Divination systems")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Editor blocks")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  test("rule 38 — NO popularity sort / trending / featured anywhere", () => {
    const { container } = render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("popular");
    expect(html).not.toContain("trending");
    expect(html).not.toContain("featured");
    expect(html).not.toContain("rank");
  });

  test("renders both recent columns", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(screen.getByText("Geomancy Workbench")).toBeInTheDocument();
    expect(screen.getByText("Coptic Calendar")).toBeInTheDocument();
  });

  test("for-authors CTA renders verbatim copy", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(
      screen.getByText(
        /every submission is read by a human before it is accepted/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Submit a plugin/i)).toBeInTheDocument();
  });

  test("Submit a plugin CTA href is overridable", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
        submitHref="/custom-submit"
      />,
    );
    const cta = screen.getByText(/Submit a plugin/i).closest("a");
    expect(cta).toHaveAttribute("href", "/custom-submit");
  });

  test("footer links render", () => {
    render(
      <RegistryPublicHomeSurface
        extensionPoints={EXTENSION_POINTS}
        recentlyUpdated={RECENTLY_UPDATED}
        recentlyAdded={RECENTLY_ADDED}
      />,
    );
    expect(
      screen.getByText(/Theourgia main site/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Plugin platform/i),
    ).toBeInTheDocument();
  });
});
