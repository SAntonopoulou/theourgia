/**
 * CrossPostPreviewModal — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Mastodon preview is rendered in Mastodon's own colour
 *     palette (not Theourgia tokens) — the user sees what the
 *     audience will see.
 *   * Three "Before you post" disclosure bullets render verbatim,
 *     in fixed order.
 *   * Content warning preserved by default (toggle ON).
 *   * Footer disclosure "Posts once, now…" verbatim.
 *   * Esc + scrim → skip (never cross-post).
 *   * Cross-post fires with the keepCw flag.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { CrossPostPreviewModal } from "./CrossPostPreviewModal.js";
import {
  CPP_CROSSPOST_CTA,
  CPP_DIALOG_TITLE,
  CPP_DISCLOSURE_DEGRADE,
  CPP_FOOTER_NOTE,
  CPP_KEEP_CW,
  CPP_SKIP_CTA,
} from "./copy.js";

function renderModal(
  overrides: Partial<
    Parameters<typeof CrossPostPreviewModal>[0]
  > = {},
) {
  const onSkip = vi.fn();
  const onCrossPost = vi.fn();
  const result = render(
    <CrossPostPreviewModal
      entryTitle="On the Discipline of the Dark Moon"
      authorName="Aspasia of the Crossroads"
      authorHandle="@aspasia@hearth.sophia.example"
      authorInitial="Θ"
      contentWarning="Ritual account — dark moon practice"
      previewBody="On the discipline of the dark moon: the practice is one of restraint…"
      canonicalUrl="hearth.sophia.example/@aspasia/dark-moon"
      onSkip={onSkip}
      onCrossPost={onCrossPost}
      {...overrides}
    />,
  );
  return { ...result, onSkip, onCrossPost };
}

// ─── Chrome ────────────────────────────────────────────────────

describe("CrossPostPreviewModal — chrome", () => {
  it("renders the verbatim dialog title", () => {
    renderModal();
    expect(screen.getByText(CPP_DIALOG_TITLE)).toBeInTheDocument();
  });

  it("entry subtitle in smart-quotes", () => {
    renderModal();
    expect(
      document.querySelector("[data-field='entry-subtitle']")
        ?.textContent,
    ).toBe("“On the Discipline of the Dark Moon”");
  });

  it("footer note verbatim", () => {
    renderModal();
    expect(
      document.querySelector("[data-field='footer-note']")?.textContent,
    ).toBe(CPP_FOOTER_NOTE);
  });
});

// ─── Mastodon preview pane ────────────────────────────────────────

describe("CrossPostPreviewModal — Mastodon preview", () => {
  it("renders in Mastodon palette (NOT Theourgia tokens)", () => {
    renderModal();
    const card = document.querySelector(
      "[data-field='mastodon-card']",
    ) as HTMLElement;
    // Mastodon uses literal hex tokens; we assert no Theourgia
    // var() references leak into the preview.
    expect(card.style.background).not.toContain("var(--");
    expect(card.style.background.toLowerCase()).toContain("#");
  });

  it("renders author name + handle in Mastodon palette", () => {
    renderModal();
    const name = document.querySelector(
      "[data-field='masto-author-name']",
    ) as HTMLElement;
    expect(name.textContent).toBe("Aspasia of the Crossroads");
    const handle = document.querySelector(
      "[data-field='masto-author-handle']",
    ) as HTMLElement;
    expect(handle.textContent).toBe(
      "@aspasia@hearth.sophia.example",
    );
  });

  it("renders content warning when keepCw is ON (default)", () => {
    renderModal();
    expect(
      document.querySelector("[data-field='masto-cw']"),
    ).not.toBeNull();
  });

  it("hides content warning when toggle is OFF", () => {
    renderModal();
    fireEvent.click(
      document.querySelector("[data-field='cw-switch']") as HTMLElement,
    );
    expect(
      document.querySelector("[data-field='masto-cw']"),
    ).toBeNull();
  });
});

// ─── Disclosures ──────────────────────────────────────────────

describe("CrossPostPreviewModal — disclosures", () => {
  it("renders the three disclosures in fixed order", () => {
    renderModal();
    const fields = Array.from(
      document.querySelectorAll(
        "[data-field^='disclosure-']",
      ),
    ).map((el) => el.getAttribute("data-field"));
    expect(fields).toEqual([
      "disclosure-visibility",
      "disclosure-degrade",
      "disclosure-settings",
    ]);
  });

  it("visibility disclosure marks 'Public' with <strong>", () => {
    renderModal();
    const bullet = document.querySelector(
      "[data-field='disclosure-visibility']",
    ) as HTMLElement;
    expect(bullet.querySelector("strong")?.textContent).toBe(
      "Public",
    );
    expect(bullet.textContent).toContain(
      "Only entries set to Public reach the Fediverse",
    );
  });

  it("graceful-degrade disclosure renders verbatim", () => {
    renderModal();
    expect(
      document
        .querySelector("[data-field='disclosure-degrade']")
        ?.textContent?.trim(),
    ).toBe(CPP_DISCLOSURE_DEGRADE);
  });

  it("settings disclosure has a clickable 'Settings → Fediverse' link", () => {
    const onOpenSettings = vi.fn();
    renderModal({ onOpenSettings });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-settings']",
      ) as HTMLElement,
    );
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

// ─── CW toggle ────────────────────────────────────────────────

describe("CrossPostPreviewModal — content warning", () => {
  it("CW toggle defaults ON", () => {
    renderModal();
    const sw = document.querySelector(
      "[data-field='cw-switch']",
    ) as HTMLElement;
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("CW switch label is verbatim", () => {
    renderModal();
    expect(screen.getByText(CPP_KEEP_CW)).toBeInTheDocument();
  });
});

// ─── Cancel / Cross-post ─────────────────────────────────────

describe("CrossPostPreviewModal — affordances", () => {
  it("Skip fires onSkip", () => {
    const { onSkip } = renderModal();
    fireEvent.click(screen.getByText(CPP_SKIP_CTA));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("Cross-post fires onCrossPost with keepCw=true by default", () => {
    const { onCrossPost } = renderModal();
    fireEvent.click(screen.getByText(CPP_CROSSPOST_CTA));
    expect(onCrossPost).toHaveBeenCalledWith({ keepCw: true });
  });

  it("Cross-post passes keepCw=false after toggle off", () => {
    const { onCrossPost } = renderModal();
    fireEvent.click(
      document.querySelector("[data-field='cw-switch']") as HTMLElement,
    );
    fireEvent.click(screen.getByText(CPP_CROSSPOST_CTA));
    expect(onCrossPost).toHaveBeenCalledWith({ keepCw: false });
  });

  it("Escape → skip (never cross-post)", () => {
    const { onSkip, onCrossPost } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onCrossPost).not.toHaveBeenCalled();
  });

  it("scrim click → skip", () => {
    const { onSkip } = renderModal();
    const scrim = document.querySelector(
      "[data-surface='cross-post-preview']",
    ) as HTMLElement;
    fireEvent.click(scrim);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("Cross-post CTA uses --accent chrome", () => {
    renderModal();
    const cta = document.querySelector(
      "[data-action='cross-post']",
    ) as HTMLElement;
    expect(cta.style.background).toContain("--accent");
  });
});
