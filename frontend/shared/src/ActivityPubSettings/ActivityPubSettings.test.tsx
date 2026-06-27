/**
 * ActivityPubSettingsSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Master switch is OFF by default.
 *   * Toggling OFF→ON opens the danger-confirm alertdialog.
 *   * Confirming flips the master switch ON and dismisses the
 *     dialog. Cancelling leaves the master OFF.
 *   * Toggling ON→OFF is single-tap (no confirm).
 *   * Confirm dialog uses --danger chrome (rule 2: --danger is
 *     RESERVED for Visibility-becoming-Public-equivalent moments;
 *     this is the matching irreversible-feeling step).
 *   * Body dims (opacity .42, pointer-events:none) when disabled.
 *   * Delete-broadcast outbound switch defaults to OFF.
 *   * Save fires onSave with the full draft.
 *   * Master sub copy reflects current state verbatim.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ActivityPubSettingsSurface,
} from "./ActivityPubSettingsSurface.js";
import {
  APS_CONFIRM_CANCEL,
  APS_CONFIRM_OK,
  APS_CONFIRM_TITLE,
  APS_MASTER_SUB_OFF,
  APS_MASTER_SUB_ON,
  APS_SAVE_CTA,
  APS_TITLE,
} from "./copy.js";

function renderAps(
  overrides: Partial<
    Parameters<typeof ActivityPubSettingsSurface>[0]
  > = {},
) {
  return render(
    <ActivityPubSettingsSurface
      webFingerHandle="@aspasia@hearth.sophia.example"
      {...overrides}
    />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("ActivityPubSettingsSurface — chrome", () => {
  it("renders the verbatim title", () => {
    renderAps();
    expect(screen.getByText(APS_TITLE)).toBeInTheDocument();
  });

  it("renders the WebFinger handle verbatim in --font-mono", () => {
    renderAps();
    const handle = document.querySelector(
      "[data-field='webfinger-handle']",
    ) as HTMLElement;
    expect(handle.textContent).toBe(
      "@aspasia@hearth.sophia.example",
    );
    expect(handle.style.fontFamily).toContain("font-mono");
  });

  it("intro paragraph emphasises 'public' inline", () => {
    renderAps();
    const intro = document.querySelector(
      "[data-field='intro']",
    ) as HTMLElement;
    expect(intro.querySelector("em")?.textContent).toBe("public");
  });
});

// ─── Master switch ────────────────────────────────────────────────

describe("ActivityPubSettingsSurface — master switch", () => {
  it("master switch is OFF by default", () => {
    renderAps();
    const master = document.querySelector(
      "[data-field='master-switch']",
    ) as HTMLElement;
    expect(master.getAttribute("aria-checked")).toBe("false");
    expect(
      document.querySelector("[data-field='master-sub']")?.textContent,
    ).toBe(APS_MASTER_SUB_OFF);
  });

  it("body dims (opacity .42, pointer-events:none) when disabled", () => {
    renderAps();
    const body = document.querySelector(
      "[data-field='body']",
    ) as HTMLElement;
    expect(body.getAttribute("data-enabled")).toBe("false");
    expect(parseFloat(body.style.opacity)).toBeLessThan(1);
    expect(body.style.pointerEvents).toBe("none");
  });

  it("OFF→ON opens the danger-confirm alertdialog (not flipped yet)", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-modal='aps-first-activation']"),
    ).not.toBeNull();
    // master still OFF until confirm
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("confirm-cancel keeps master OFF + dismisses dialog", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    fireEvent.click(screen.getByText(APS_CONFIRM_CANCEL));
    expect(
      document.querySelector("[data-modal='aps-first-activation']"),
    ).toBeNull();
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("confirm-enable flips master ON + sub copy swaps", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    fireEvent.click(screen.getByText(APS_CONFIRM_OK));
    expect(
      document.querySelector("[data-modal='aps-first-activation']"),
    ).toBeNull();
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      document.querySelector("[data-field='master-sub']")?.textContent,
    ).toBe(APS_MASTER_SUB_ON);
  });

  it("ON→OFF is single tap (no confirm)", () => {
    renderAps({ initial: { enabled: true } });
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    // No dialog opened.
    expect(
      document.querySelector("[data-modal='aps-first-activation']"),
    ).toBeNull();
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });
});

// ─── Confirm dialog ──────────────────────────────────────────────

describe("ActivityPubSettingsSurface — first-activation confirm", () => {
  it("renders title + sub verbatim", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    expect(screen.getByText(APS_CONFIRM_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is the one irreversible-feeling step in Theourgia.",
      ),
    ).toBeInTheDocument();
  });

  it("body emphasises 'public' inline (strong)", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    const body = document.querySelector(
      "[data-field='confirm-body']",
    ) as HTMLElement;
    expect(body.querySelector("strong")?.textContent).toBe(
      "public",
    );
  });

  it("Enable CTA uses --danger chrome (rule 2)", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    const ok = document.querySelector(
      "[data-action='confirm-enable']",
    ) as HTMLElement;
    expect(ok.style.background).toContain("--danger-soft");
    expect(ok.style.borderColor).toContain("--danger");
    expect(ok.style.color).toContain("--danger");
  });

  it("Escape → cancel (master stays OFF)", () => {
    renderAps();
    fireEvent.click(
      document.querySelector(
        "[data-field='master-switch']",
      ) as HTMLElement,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      document.querySelector("[data-modal='aps-first-activation']"),
    ).toBeNull();
    expect(
      document
        .querySelector("[data-field='master-switch']")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });
});

// ─── Outbound defaults ───────────────────────────────────────────

describe("ActivityPubSettingsSurface — outbound defaults", () => {
  it("delete-broadcast defaults to OFF", () => {
    renderAps({ initial: { enabled: true } });
    const row = document.querySelector(
      "[data-outbound-key='delete']",
    ) as HTMLElement;
    expect(row.getAttribute("data-on")).toBe("false");
  });

  it("create + update default to ON", () => {
    renderAps({ initial: { enabled: true } });
    expect(
      document
        .querySelector("[data-outbound-key='create']")
        ?.getAttribute("data-on"),
    ).toBe("true");
    expect(
      document
        .querySelector("[data-outbound-key='update']")
        ?.getAttribute("data-on"),
    ).toBe("true");
  });
});

// ─── Save flow ───────────────────────────────────────────────────

describe("ActivityPubSettingsSurface — save flow", () => {
  it("Save disabled when master OFF", () => {
    renderAps();
    const save = document.querySelector(
      "[data-action='save']",
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("Save fires onSave with the full draft when enabled", () => {
    const onSave = vi.fn();
    renderAps({ initial: { enabled: true }, onSave });
    fireEvent.click(screen.getByText(APS_SAVE_CTA));
    expect(onSave).toHaveBeenCalledTimes(1);
    const draft = onSave.mock.calls[0][0];
    expect(draft.enabled).toBe(true);
    expect(draft.approval).toBe("manual");
    expect(draft.outbound.delete).toBe(false);
    expect(draft.objectMappings.essays).toBe("Article");
  });

  it("changing the approval radio flows into the save payload", () => {
    const onSave = vi.fn();
    renderAps({ initial: { enabled: true }, onSave });
    fireEvent.click(
      document.querySelector(
        "[data-approval='auto']",
      ) as HTMLElement,
    );
    fireEvent.click(screen.getByText(APS_SAVE_CTA));
    expect(onSave.mock.calls[0][0].approval).toBe("auto");
  });
});

// ─── Smoke ────────────────────────────────────────────────────

describe("ActivityPubSettingsSurface — smoke", () => {
  it("renders all four object-mapping rows", () => {
    renderAps();
    expect(
      document.querySelectorAll("[data-field='object-row']"),
    ).toHaveLength(4);
  });

  it("renders all three outbound rows", () => {
    renderAps();
    expect(
      document.querySelectorAll("[data-field='outbound-row']"),
    ).toHaveLength(3);
  });
});
