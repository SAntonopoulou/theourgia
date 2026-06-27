/**
 * PushToHubModal — unit tests.
 *
 * Defining honesty rules:
 *
 *   * **Sealed entries NEVER push.** The sealed branch renders
 *     the verbatim block callout, the Push CTA is disabled, and
 *     clicking it does NOT call onPush.
 *   * Auto-curating hubs render --warn chrome (NEVER --danger).
 *   * Reviewing hubs render --peer-ok chrome.
 *   * Push CTA in network mode uses --warn-soft (consequential
 *     edit), NOT --danger and NOT --accent.
 *   * Empty selection disables Push.
 *   * Cache notice + network helper are verbatim.
 *   * Esc + scrim → cancel.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  PushToHubModal,
  type PthHubOption,
} from "./PushToHubModal.js";
import {
  PTH_CACHE_NOTICE,
  PTH_CANCEL_CTA,
  PTH_HUB_TAG_AUTO_CURATES,
  PTH_HUB_TAG_REVIEWS,
  PTH_NETWORK_HELPER,
  PTH_PUSH_CTA,
  PTH_SEALED_BODY,
  PTH_SEALED_TITLE,
  PTH_TITLE,
} from "./copy.js";

const HUBS: PthHubOption[] = [
  {
    id: "h-coven",
    name: "The Crossroads Coven",
    roleLabel: "an officer",
    autoCurates: false,
  },
  {
    id: "h-hedgerow",
    name: "Hedgerow Study Group",
    roleLabel: "an admin",
    autoCurates: true,
  },
  {
    id: "h-hermetic",
    name: "The Hermetic Circle",
    roleLabel: "a member",
    autoCurates: false,
  },
];

function renderPush(
  overrides: Partial<
    Parameters<typeof PushToHubModal>[0]
  > = {},
) {
  const onCancel = vi.fn();
  const onPush = vi.fn();
  const result = render(
    <PushToHubModal
      entryTitle="Dark-moon Deipnon at the shared stone"
      entryKind="network"
      hubs={HUBS}
      onCancel={onCancel}
      onPush={onPush}
      {...overrides}
    />,
  );
  return { ...result, onCancel, onPush };
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("PushToHubModal — chrome", () => {
  it("renders the title verbatim", () => {
    renderPush();
    expect(screen.getByText(PTH_TITLE)).toBeInTheDocument();
  });

  it("entry title appears in smart-quotes under the heading", () => {
    renderPush();
    expect(
      document.querySelector("[data-field='entry-title']")?.textContent,
    ).toBe("“Dark-moon Deipnon at the shared stone”");
  });
});

// ─── Network entry body ───────────────────────────────────────────

describe("PushToHubModal — network entry body", () => {
  it("renders one row per hub", () => {
    renderPush();
    expect(
      document.querySelectorAll("[data-hub-id]"),
    ).toHaveLength(3);
  });

  it("renders 'you're {role}' verbatim", () => {
    renderPush();
    const row = document.querySelector(
      "[data-hub-id='h-coven']",
    ) as HTMLElement;
    expect(
      row.querySelector("[data-field='hub-role']")?.textContent,
    ).toBe("you're an officer");
  });

  it("auto-curating hubs render --warn chrome (NEVER --danger)", () => {
    renderPush();
    const tag = document.querySelector(
      "[data-hub-id='h-hedgerow'] [data-field='hub-tag']",
    ) as HTMLElement;
    expect(tag.getAttribute("data-tone")).toBe("warn");
    expect(tag.textContent).toBe(PTH_HUB_TAG_AUTO_CURATES);
    expect(tag.style.color).toContain("--warn");
    expect(tag.style.color).not.toContain("--danger");
    expect(tag.style.background).not.toContain("--danger");
  });

  it("reviewing hubs render --peer-ok chrome", () => {
    renderPush();
    const tag = document.querySelector(
      "[data-hub-id='h-coven'] [data-field='hub-tag']",
    ) as HTMLElement;
    expect(tag.getAttribute("data-tone")).toBe("peer-ok");
    expect(tag.textContent).toBe(PTH_HUB_TAG_REVIEWS);
    expect(tag.style.color).toContain("--peer-ok");
  });

  it("renders the network helper line verbatim", () => {
    renderPush();
    expect(
      document.querySelector("[data-field='network-helper']")
        ?.textContent,
    ).toBe(PTH_NETWORK_HELPER);
  });

  it("renders the cache notice verbatim", () => {
    renderPush();
    expect(
      document
        .querySelector("[data-field='cache-notice']")
        ?.textContent?.trim(),
    ).toBe(PTH_CACHE_NOTICE);
  });
});

// ─── Push semantics ──────────────────────────────────────────────

describe("PushToHubModal — push semantics", () => {
  it("Push is disabled with empty selection", () => {
    renderPush();
    const push = document.querySelector(
      "[data-action='push']",
    ) as HTMLButtonElement;
    expect(push.disabled).toBe(true);
    expect(push.getAttribute("data-disabled")).toBe("true");
  });

  it("checking a hub enables Push", () => {
    renderPush();
    const row = document.querySelector(
      "[data-hub-id='h-coven']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-field='hub-check']") as HTMLElement,
    );
    const push = document.querySelector(
      "[data-action='push']",
    ) as HTMLButtonElement;
    expect(push.disabled).toBe(false);
  });

  it("clicking Push fires onPush with the selected hub ids", () => {
    const { onPush } = renderPush({
      initialSelectedIds: ["h-coven", "h-hedgerow"],
    });
    fireEvent.click(screen.getByText(PTH_PUSH_CTA));
    expect(onPush).toHaveBeenCalledWith({
      hubIds: ["h-coven", "h-hedgerow"],
    });
  });

  it("Push CTA uses --warn-soft (NEVER --danger NEVER --accent default)", () => {
    renderPush({ initialSelectedIds: ["h-coven"] });
    const push = document.querySelector(
      "[data-action='push']",
    ) as HTMLElement;
    expect(push.style.background).toContain("--warn-soft");
    expect(push.style.background).not.toContain("--danger");
    expect(push.style.background).not.toBe("var(--accent)");
  });
});

// ─── Sealed entry blocked ────────────────────────────────────────

describe("PushToHubModal — sealed entries blocked", () => {
  it("renders the verbatim sealed callout", () => {
    renderPush({ entryKind: "sealed" });
    const callout = document.querySelector(
      "[data-field='sealed-blocked']",
    ) as HTMLElement;
    expect(callout).not.toBeNull();
    expect(
      document.querySelector("[data-field='sealed-blocked-title']")
        ?.textContent,
    ).toBe(PTH_SEALED_TITLE);
    expect(
      document.querySelector("[data-field='sealed-blocked-body']")
        ?.textContent,
    ).toBe(PTH_SEALED_BODY);
  });

  it("does NOT render the hub picker / network helper / cache notice", () => {
    renderPush({ entryKind: "sealed" });
    expect(
      document.querySelector("[data-field='hub-picker']"),
    ).toBeNull();
    expect(
      document.querySelector("[data-field='network-helper']"),
    ).toBeNull();
    expect(
      document.querySelector("[data-field='cache-notice']"),
    ).toBeNull();
  });

  it("Push is disabled in sealed mode", () => {
    renderPush({ entryKind: "sealed" });
    const push = document.querySelector(
      "[data-action='push']",
    ) as HTMLButtonElement;
    expect(push.disabled).toBe(true);
  });

  it("clicking Push in sealed mode does NOT fire onPush", () => {
    const { onPush } = renderPush({
      entryKind: "sealed",
      // Even if a consumer passes initial selection, sealed
      // refuses.
      initialSelectedIds: ["h-coven"],
    });
    fireEvent.click(screen.getByText(PTH_PUSH_CTA));
    expect(onPush).not.toHaveBeenCalled();
  });

  it("sealed callout uses --seal-soft chrome", () => {
    renderPush({ entryKind: "sealed" });
    const callout = document.querySelector(
      "[data-field='sealed-blocked']",
    ) as HTMLElement;
    expect(callout.style.background).toContain("--seal-soft");
    expect(callout.style.background).not.toContain("--danger");
  });
});

// ─── Cancel affordances ──────────────────────────────────────────

describe("PushToHubModal — cancel affordances", () => {
  it("Cancel fires onCancel", () => {
    const { onCancel } = renderPush();
    fireEvent.click(screen.getByText(PTH_CANCEL_CTA));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape → cancel", () => {
    const { onCancel } = renderPush();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("scrim click → cancel", () => {
    const { onCancel } = renderPush();
    const scrim = document.querySelector(
      "[data-surface='push-to-hub']",
    ) as HTMLElement;
    fireEvent.click(scrim);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
