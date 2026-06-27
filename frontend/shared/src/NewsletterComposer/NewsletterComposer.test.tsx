/**
 * NewsletterComposerSurface — unit tests.
 *
 * The defining honesty rules:
 *
 *   * Send-now CTA uses --warn-soft (NEVER --danger).
 *   * Footer disclaimer is verbatim (per-recipient unsubscribe +
 *     once-sent immutability).
 *   * Confirm modal subtitle is verbatim ("Once sent, a
 *     newsletter cannot be recalled.").
 *   * The confirm modal shows the recipient count in both the
 *     header AND the primary CTA — verbatim format.
 *   * Source picker shows ONLY the supplied (approved) submissions.
 *   * onSend fires ONLY after confirm, never on the topbar CTA
 *     click.
 *   * No engagement-metric chrome (open rate / click count /
 *     "high engagement").
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  NewsletterComposerSurface,
  type NewsletterSource,
} from "./NewsletterComposerSurface.js";
import {
  NNC_CONFIRM_NOT_YET,
  NNC_CONFIRM_SUBTITLE,
  NNC_FOOTER_DISCLAIMER,
  NNC_PREVIEW_CTA,
  NNC_SEND_NOW_CTA,
  NNC_SOURCES_HEADING,
  NNC_SUBHEADER,
  type NewsletterBodyPart,
} from "./copy.js";

const SOURCES: NewsletterSource[] = [
  {
    id: "src-deipnon",
    kind: "entry",
    title: "Dark-moon Deipnon at the shared stone",
    byHandle: "diotima",
  },
  {
    id: "src-draw",
    kind: "divination",
    title: "A three-card draw on the spring rite",
    byHandle: "soror-aurora",
  },
  {
    id: "src-ephesia",
    kind: "publication",
    title: "On the Ephesia Grammata",
    byHandle: "soror-aurora",
  },
];

const BODY: NewsletterBodyPart[] = [
  {
    kind: "paragraph",
    text: "Friends of the crossroads — a fuller month than most.",
  },
  {
    kind: "embed",
    embedKind: "entry",
    did: "did:theourgia:terra.example:diotima",
    title: "Dark-moon Deipnon at the shared stone",
    excerpt:
      "The lamp held all night; I have never felt the crossroads so open.",
  },
  { kind: "paragraph", text: "Keep the lamp. — the officers" },
];

function renderNC(
  overrides: Partial<
    Parameters<typeof NewsletterComposerSurface>[0]
  > = {},
) {
  return render(
    <NewsletterComposerSurface
      hubName="Crossroads Coven"
      recipientCount={34}
      title="The crossroads, this month"
      sources={SOURCES}
      bodyParts={BODY}
      {...overrides}
    />,
  );
}

// ─── Header ────────────────────────────────────────────────────────

describe("NewsletterComposerSurface — header", () => {
  it("renders '{hub} · newsletter' + the subheader verbatim", () => {
    renderNC();
    expect(
      screen.getByText("Crossroads Coven · newsletter"),
    ).toBeInTheDocument();
    expect(screen.getByText(NNC_SUBHEADER)).toBeInTheDocument();
  });

  it("Preview CTA fires onPreview", () => {
    const onPreview = vi.fn();
    renderNC({ onPreview });
    fireEvent.click(screen.getByText(NNC_PREVIEW_CTA));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it("Send-now CTA uses --warn-soft chrome (NEVER --danger)", () => {
    renderNC();
    const cta = document.querySelector(
      "[data-action='open-send-confirm']",
    ) as HTMLElement;
    expect(cta.textContent).toBe(NNC_SEND_NOW_CTA);
    expect(cta.style.background).toContain("--warn-soft");
    expect(cta.style.borderColor).toContain("--warn-border");
    expect(cta.style.background).not.toContain("--danger");
  });

  it("Send-now CTA does NOT fire onSend on its own click", () => {
    const onSend = vi.fn();
    renderNC({ onSend });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    expect(onSend).not.toHaveBeenCalled();
  });
});

// ─── Source picker ────────────────────────────────────────────────

describe("NewsletterComposerSurface — source picker", () => {
  it("renders the picker eyebrow verbatim", () => {
    renderNC();
    expect(screen.getByText(NNC_SOURCES_HEADING)).toBeInTheDocument();
  });

  it("renders one card per supplied source", () => {
    renderNC();
    expect(
      document.querySelectorAll("[data-source-id]"),
    ).toHaveLength(3);
  });

  it("renders the byHandle in --font-mono", () => {
    renderNC();
    const card = document.querySelector(
      "[data-source-id='src-deipnon']",
    ) as HTMLElement;
    const by = card.querySelector("[data-field='by']") as HTMLElement;
    expect(by.textContent).toBe("diotima");
    expect(by.style.fontFamily).toContain("font-mono");
  });

  it("calls onInsertSource with the source id when a card is clicked", () => {
    const onInsertSource = vi.fn();
    renderNC({ onInsertSource });
    const card = document.querySelector(
      "[data-source-id='src-draw']",
    ) as HTMLElement;
    fireEvent.click(card);
    expect(onInsertSource).toHaveBeenCalledWith("src-draw");
  });
});

// ─── Editor body ──────────────────────────────────────────────────

describe("NewsletterComposerSurface — editor body", () => {
  it("renders the issue title in the editable input", () => {
    renderNC();
    const input = document.querySelector(
      "[data-field='title']",
    ) as HTMLInputElement;
    expect(input.value).toBe("The crossroads, this month");
  });

  it("fires onTitleChange when the title input changes", () => {
    const onTitleChange = vi.fn();
    renderNC({ onTitleChange });
    const input = document.querySelector(
      "[data-field='title']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "A new month" } });
    expect(onTitleChange).toHaveBeenCalledWith("A new month");
  });

  it("renders one paragraph per body part of kind=paragraph", () => {
    renderNC();
    expect(
      document.querySelectorAll("[data-body-part='paragraph']"),
    ).toHaveLength(2);
  });

  it("renders one embed card per body part of kind=embed", () => {
    renderNC();
    const embed = document.querySelector("[data-body-part='embed']") as HTMLElement;
    expect(embed).not.toBeNull();
    expect(embed.getAttribute("data-embed-kind")).toBe("entry");
    const did = embed.querySelector("[data-field='did']") as HTMLElement;
    expect(did.textContent).toBe("did:theourgia:terra.example:diotima");
    expect(did.style.fontFamily).toContain("font-mono");
  });

  it("embed pill renders 'embedded · {kind}' verbatim", () => {
    renderNC();
    const pill = document.querySelector(
      "[data-pill='embed']",
    ) as HTMLElement;
    expect(pill.textContent).toBe("embedded · entry");
  });
});

// ─── Footer disclaimer ────────────────────────────────────────────

describe("NewsletterComposerSurface — footer disclaimer", () => {
  it("renders the verbatim once-sent-is-frozen disclaimer", () => {
    renderNC();
    const f = document.querySelector(
      "[data-field='footer-disclaimer']",
    ) as HTMLElement;
    expect(f.textContent).toContain(NNC_FOOTER_DISCLAIMER);
  });
});

// ─── Confirm modal ────────────────────────────────────────────────

describe("NewsletterComposerSurface — confirm modal", () => {
  it("opens when Send-now is clicked", () => {
    renderNC();
    expect(document.querySelector("[data-modal='confirm-send']")).toBeNull();
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-modal='confirm-send']"),
    ).not.toBeNull();
  });

  it("renders the recipient count in the header verbatim", () => {
    renderNC({ recipientCount: 42 });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    const header = document.querySelector(
      "[data-field='confirm-header']",
    ) as HTMLElement;
    expect(header.textContent).toBe("Send to 42 members?");
  });

  it("renders the verbatim subtitle", () => {
    renderNC();
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-field='confirm-subtitle']")
        ?.textContent,
    ).toBe(NNC_CONFIRM_SUBTITLE);
  });

  it("primary CTA renders 'Send to {n} members' verbatim", () => {
    renderNC({ recipientCount: 42 });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    const send = document.querySelector(
      "[data-action='confirm-send']",
    ) as HTMLElement;
    expect(send.textContent).toBe("Send to 42 members");
  });

  it("preview card shows the title + first paragraph excerpt", () => {
    renderNC();
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-field='confirm-title']")
        ?.textContent,
    ).toBe("The crossroads, this month");
    expect(
      document.querySelector("[data-field='confirm-excerpt']")
        ?.textContent,
    ).toBe(
      "Friends of the crossroads — a fuller month than most.",
    );
  });

  it("'Not yet' cancels without firing onSend", () => {
    const onSend = vi.fn();
    renderNC({ onSend });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    fireEvent.click(screen.getByText(NNC_CONFIRM_NOT_YET));
    expect(onSend).not.toHaveBeenCalled();
    expect(
      document.querySelector("[data-modal='confirm-send']"),
    ).toBeNull();
  });

  it("scrim click cancels without firing onSend", () => {
    const onSend = vi.fn();
    renderNC({ onSend });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    fireEvent.click(
      document.querySelector("[data-action='scrim']") as HTMLElement,
    );
    expect(onSend).not.toHaveBeenCalled();
  });

  it("primary CTA in the modal fires onSend", () => {
    const onSend = vi.fn();
    renderNC({ onSend });
    fireEvent.click(
      document.querySelector(
        "[data-action='open-send-confirm']",
      ) as HTMLElement,
    );
    fireEvent.click(
      document.querySelector(
        "[data-action='confirm-send']",
      ) as HTMLElement,
    );
    expect(onSend).toHaveBeenCalledTimes(1);
    // Modal closes after confirm.
    expect(
      document.querySelector("[data-modal='confirm-send']"),
    ).toBeNull();
  });
});

// ─── Defensive ────────────────────────────────────────────────────

describe("NewsletterComposerSurface — defensive", () => {
  it("renders no 'open rate' / 'click rate' / 'engagement' chrome", () => {
    renderNC();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/open rate/i);
    expect(text).not.toMatch(/click rate/i);
    expect(text).not.toMatch(/engagement/i);
    expect(text).not.toMatch(/high reach/i);
  });
});
