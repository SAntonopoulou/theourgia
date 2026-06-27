/**
 * RemoteContentEmbed — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Resolvable state shows the `‡ from {instance}` chip.
 *   * Handle in --font-mono --remote in all info states.
 *   * "View original →" copy verbatim, links to remote.
 *   * Loading state has aria-busy=true.
 *   * Unresolvable state preserves author handle + instance —
 *     citation survives the post's disappearance.
 *   * All three states render --remote chrome NOT --danger.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { RemoteContentEmbed } from "./RemoteContentEmbed.js";
import { RCE_UNRESOLVABLE_TITLE, RCE_VIEW_ORIGINAL } from "./copy.js";

// ─── Resolvable ──────────────────────────────────────────────────

describe("RemoteContentEmbed — resolvable state", () => {
  it("renders author + handle + from-chip", () => {
    render(
      <RemoteContentEmbed
        state="resolvable"
        authorName="Frater Lux"
        authorHandle="@frater-lux@thelema.example"
        instance="thelema.example"
        authorInitial="F"
        body="Kept the Deipnon at the crossroads stone."
        postedAtLabel="27 Jun 2026 · 21:14"
        originalHref="https://thelema.example/notes/abc"
      />,
    );
    expect(
      document.querySelector("[data-field='author-name']")?.textContent,
    ).toBe("Frater Lux");
    expect(
      document.querySelector("[data-field='author-handle']")
        ?.textContent,
    ).toBe("@frater-lux@thelema.example");
    const chip = document.querySelector(
      "[data-field='from-chip']",
    ) as HTMLElement;
    expect(chip.textContent).toContain("‡");
    expect(chip.textContent).toContain("from thelema.example");
    expect(chip.style.color).toContain("--remote");
  });

  it("View original → copy is verbatim and links to remote", () => {
    render(
      <RemoteContentEmbed
        state="resolvable"
        authorName="X"
        authorHandle="@x@y.example"
        instance="y.example"
        authorInitial="X"
        body="body"
        postedAtLabel="ts"
        originalHref="https://y.example/post/1"
      />,
    );
    const link = document.querySelector(
      "[data-field='view-original']",
    ) as HTMLAnchorElement;
    expect(link.textContent).toBe(RCE_VIEW_ORIGINAL);
    expect(link.getAttribute("href")).toBe("https://y.example/post/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.style.color).toContain("--remote");
  });

  it("handle is --font-mono --remote", () => {
    render(
      <RemoteContentEmbed
        state="resolvable"
        authorName="X"
        authorHandle="@x@y.example"
        instance="y.example"
        authorInitial="X"
        body="body"
        postedAtLabel="ts"
      />,
    );
    const handle = document.querySelector(
      "[data-field='author-handle']",
    ) as HTMLElement;
    expect(handle.style.fontFamily).toContain("font-mono");
    expect(handle.style.color).toContain("--remote");
  });

  it("--remote border on the card (NEVER --danger)", () => {
    render(
      <RemoteContentEmbed
        state="resolvable"
        authorName="X"
        authorHandle="@x@y.example"
        instance="y.example"
        authorInitial="X"
        body="body"
        postedAtLabel="ts"
      />,
    );
    const card = document.querySelector(
      "[data-surface='remote-content-embed']",
    ) as HTMLElement;
    expect(card.style.borderColor).toContain("--remote");
    expect(card.style.borderColor).not.toContain("--danger");
  });

  it("View original click fires onViewOriginal", () => {
    const onViewOriginal = vi.fn();
    render(
      <RemoteContentEmbed
        state="resolvable"
        authorName="X"
        authorHandle="@x@y.example"
        instance="y.example"
        authorInitial="X"
        body="body"
        postedAtLabel="ts"
        originalHref="https://y.example/p/1"
        onViewOriginal={onViewOriginal}
      />,
    );
    fireEvent.click(screen.getByText(RCE_VIEW_ORIGINAL));
    expect(onViewOriginal).toHaveBeenCalledTimes(1);
  });
});

// ─── Loading ─────────────────────────────────────────────────────

describe("RemoteContentEmbed — loading state", () => {
  it("renders aria-busy=true + role=status", () => {
    render(<RemoteContentEmbed state="loading" />);
    const card = document.querySelector(
      "[data-surface='remote-content-embed']",
    ) as HTMLElement;
    expect(card.getAttribute("data-state")).toBe("loading");
    expect(card.getAttribute("aria-busy")).toBe("true");
    expect(card.getAttribute("role")).toBe("status");
  });
});

// ─── Unresolvable ────────────────────────────────────────────────

describe("RemoteContentEmbed — unresolvable state", () => {
  it("renders the verbatim 'Original post no longer available' title", () => {
    render(
      <RemoteContentEmbed
        state="unresolvable"
        authorHandle="@orphic@pleroma.example"
        instance="pleroma.example"
      />,
    );
    expect(
      document.querySelector("[data-field='unresolvable-title']")
        ?.textContent,
    ).toBe(RCE_UNRESOLVABLE_TITLE);
  });

  it("preserves author handle + instance citation", () => {
    render(
      <RemoteContentEmbed
        state="unresolvable"
        authorHandle="@orphic@pleroma.example"
        instance="pleroma.example"
      />,
    );
    const citation = document.querySelector(
      "[data-field='unresolvable-citation']",
    ) as HTMLElement;
    expect(citation.textContent).toContain(
      "@orphic@pleroma.example",
    );
    expect(citation.textContent).toContain("‡");
    expect(citation.textContent).toContain("from pleroma.example");
    expect(citation.style.fontFamily).toContain("font-mono");
  });

  it("uses dashed border NOT --danger", () => {
    render(
      <RemoteContentEmbed
        state="unresolvable"
        authorHandle="@x@y.example"
        instance="y.example"
      />,
    );
    const card = document.querySelector(
      "[data-surface='remote-content-embed']",
    ) as HTMLElement;
    expect(card.style.borderStyle).toBe("dashed");
    expect(card.style.borderColor).not.toContain("--danger");
  });
});
