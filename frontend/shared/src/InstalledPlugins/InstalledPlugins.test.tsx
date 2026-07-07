/**
 * InstalledPluginsSurface — unit tests.
 *
 * Honesty rules covered:
 *
 *   * Sort respects caller order — surface does NOT re-sort
 *     (which would let popularity sneak in).
 *   * Status chips use plugin-active / disabled / plugin-error
 *     chrome — NEVER --danger.
 *   * Tombstoned plugins keep working (rule 40); the chip
 *     renders + the disabled-line border lands.
 *   * Uninstall menu item uses --warn ink — NEVER --danger.
 *   * Empty-state copy verbatim.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type InstalledPluginRow,
  InstalledPluginsSurface,
} from "./InstalledPluginsSurface.js";
import {
  IP_BROWSE_REGISTRY_CTA,
  IP_EMPTY_BODY,
  IP_EMPTY_TITLE,
  IP_SUBHEAD,
  IP_TITLE,
  IP_TOMBSTONE_LABEL,
} from "./copy.js";

const PLUGINS: InstalledPluginRow[] = [
  {
    id: "p1",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    author: "did:theourgia:terra.example:agrippa-tools",
    description: "A full geomantic divination system.",
    status: "active",
  },
  {
    id: "p2",
    kind: "cipher",
    name: "Trithemian Cipher",
    version: "v1.0.3",
    author: "did:theourgia:steganographia.example:abbot",
    description: "Encode and decode steganographic ciphers.",
    status: "disabled",
  },
  {
    id: "p3",
    kind: "editor-block",
    name: "Runic Tabular Block",
    version: "v0.9.1",
    author: "did:theourgia:nine-worlds.example:vala",
    description: "Editor blocks for Elder Futhark tables.",
    status: "error",
  },
  {
    id: "p4",
    kind: "correspondence",
    name: "Decanic Correspondences",
    version: "v1.4.2",
    author: "did:theourgia:hermetica.org:decan-press",
    description: "The thirty-six decans.",
    status: "active",
    tombstoned: true,
  },
];

function renderIp(
  overrides: Partial<
    Parameters<typeof InstalledPluginsSurface>[0]
  > = {},
) {
  return render(
    <InstalledPluginsSurface plugins={PLUGINS} {...overrides} />,
  );
}

// ─── Chrome ─────────────────────────────────────────────────────────

describe("InstalledPluginsSurface — chrome", () => {
  it("renders the title + subhead", () => {
    renderIp();
    expect(screen.getByText(IP_TITLE)).toBeInTheDocument();
    expect(screen.getByText(IP_SUBHEAD)).toBeInTheDocument();
  });

  it("count label pluralises correctly", () => {
    renderIp();
    expect(
      document.querySelector("[data-field='count-label']")?.textContent,
    ).toBe("4 plugins · most recently installed first");
  });

  it("singular count label for one plugin", () => {
    renderIp({ plugins: [PLUGINS[0]!] });
    expect(
      document.querySelector("[data-field='count-label']")?.textContent,
    ).toBe("1 plugin · most recently installed first");
  });

  it("renders one card per plugin", () => {
    renderIp();
    expect(
      document.querySelectorAll("[data-plugin-id]"),
    ).toHaveLength(4);
  });
});

// ─── Sort discipline (rule 38) ──────────────────────────────────────

describe("InstalledPluginsSurface — sort discipline", () => {
  it("renders plugins in caller order (no re-sort)", () => {
    renderIp();
    const ids = Array.from(
      document.querySelectorAll("[data-plugin-id]"),
    ).map((el) => el.getAttribute("data-plugin-id"));
    expect(ids).toEqual(["p1", "p2", "p3", "p4"]);
  });
});

// ─── Status chips ──────────────────────────────────────────────────

describe("InstalledPluginsSurface — status chips", () => {
  it("active chip uses --plugin-active-soft (NEVER --danger)", () => {
    renderIp();
    const chip = document.querySelector(
      "[data-plugin-id='p1'] [data-field='status-chip']",
    ) as HTMLElement;
    expect(chip.style.background).toContain("--plugin-active-soft");
    expect(chip.style.background).not.toContain("--danger");
    expect(chip.style.color).toContain("--plugin-active");
  });

  it("disabled chip uses --ink-mute border + transparent bg", () => {
    renderIp();
    const chip = document.querySelector(
      "[data-plugin-id='p2'] [data-field='status-chip']",
    ) as HTMLElement;
    expect(chip.style.color).toContain("--ink-mute");
    expect(chip.style.background).toBe("transparent");
  });

  it("error chip uses --plugin-error-soft (NEVER --danger)", () => {
    renderIp();
    const chip = document.querySelector(
      "[data-plugin-id='p3'] [data-field='status-chip']",
    ) as HTMLElement;
    expect(chip.style.background).toContain("--plugin-error-soft");
    expect(chip.style.background).not.toContain("--danger");
    expect(chip.style.color).toContain("--plugin-error");
  });
});

// ─── Tombstone (rule 40) ───────────────────────────────────────────

describe("InstalledPluginsSurface — tombstone (rule 40)", () => {
  it("tombstoned plugin renders the chip + disabled-line border", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p4']",
    ) as HTMLElement;
    expect(row.getAttribute("data-tombstoned")).toBe("true");
    expect(row.style.borderColor).toContain(
      "--plugin-disabled-line",
    );
    const chip = row.querySelector(
      "[data-field='tombstone-chip']",
    ) as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip.textContent).toContain(IP_TOMBSTONE_LABEL);
    expect(chip.textContent).toContain("‡");
  });

  it("non-tombstoned plugins do NOT render the chip", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p1']",
    ) as HTMLElement;
    expect(
      row.querySelector("[data-field='tombstone-chip']"),
    ).toBeNull();
  });
});

// ─── Kebab + actions ────────────────────────────────────────────────

describe("InstalledPluginsSurface — kebab", () => {
  it("opens on click + closes on second click", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p1']",
    ) as HTMLElement;
    const kebab = row.querySelector(
      "[data-action='kebab']",
    ) as HTMLElement;
    expect(row.querySelector("[data-field='kebab-menu']")).toBeNull();
    fireEvent.click(kebab);
    expect(
      row.querySelector("[data-field='kebab-menu']"),
    ).not.toBeNull();
    fireEvent.click(kebab);
    expect(row.querySelector("[data-field='kebab-menu']")).toBeNull();
  });

  it("Uninstall menu item uses --warn ink (NEVER --danger)", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p1']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='kebab']") as HTMLElement,
    );
    const uninstall = row.querySelector(
      "[data-menu-item='Uninstall']",
    ) as HTMLElement;
    expect(uninstall.getAttribute("data-warn")).toBe("true");
    expect(uninstall.style.color).toContain("--warn");
    expect(uninstall.style.color).not.toContain("--danger");
  });

  it("disabled plugin shows Activate instead of Deactivate", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p2']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='kebab']") as HTMLElement,
    );
    expect(
      row.querySelector("[data-menu-item='Activate']"),
    ).not.toBeNull();
    expect(
      row.querySelector("[data-menu-item='Deactivate']"),
    ).toBeNull();
  });

  it("active plugin shows Deactivate", () => {
    renderIp();
    const row = document.querySelector(
      "[data-plugin-id='p1']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='kebab']") as HTMLElement,
    );
    expect(
      row.querySelector("[data-menu-item='Deactivate']"),
    ).not.toBeNull();
  });

  it("onPluginAction fires with action key", () => {
    const onPluginAction = vi.fn();
    renderIp({ onPluginAction });
    const row = document.querySelector(
      "[data-plugin-id='p1']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='kebab']") as HTMLElement,
    );
    fireEvent.click(
      row.querySelector(
        "[data-menu-item='Configure']",
      ) as HTMLElement,
    );
    expect(onPluginAction).toHaveBeenCalledWith("p1", "configure");
  });
});

// ─── Empty state ───────────────────────────────────────────────────

describe("InstalledPluginsSurface — empty state", () => {
  it("renders the verbatim copy when no plugins", () => {
    renderIp({ plugins: [] });
    expect(
      document.querySelector("[data-field='empty-state']"),
    ).not.toBeNull();
    expect(screen.getByText(IP_EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(IP_EMPTY_BODY)).toBeInTheDocument();
  });

  it("Browse registry CTA fires onBrowseRegistry", () => {
    const onBrowseRegistry = vi.fn();
    renderIp({ plugins: [], onBrowseRegistry });
    fireEvent.click(
      document.querySelector(
        "[data-action='browse-registry-empty']",
      ) as HTMLElement,
    );
    expect(onBrowseRegistry).toHaveBeenCalledTimes(1);
  });
});

// ─── Topbar Browse registry CTA ────────────────────────────────────

describe("InstalledPluginsSurface — topbar Browse registry", () => {
  it("topbar CTA fires onBrowseRegistry", () => {
    const onBrowseRegistry = vi.fn();
    renderIp({ onBrowseRegistry });
    fireEvent.click(
      document.querySelector(
        "[data-action='browse-registry']",
      ) as HTMLElement,
    );
    expect(onBrowseRegistry).toHaveBeenCalledTimes(1);
  });

  it("verbatim CTA label", () => {
    renderIp();
    expect(
      document.querySelector(
        "[data-action='browse-registry']",
      )?.textContent,
    ).toContain(IP_BROWSE_REGISTRY_CTA);
  });
});
