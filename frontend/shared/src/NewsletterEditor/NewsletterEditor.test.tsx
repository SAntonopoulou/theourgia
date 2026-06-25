/**
 * NewsletterEditorSurface tests (H07 §S3 surface 11).
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type NewsletterRecipientOption,
  type NewsletterRecord,
  NewsletterEditorSurface,
} from "./index.js";

const NEWSLETTER: NewsletterRecord = {
  id: "n1",
  headline: "What the dark moon asked",
  subject: "What the dark moon asked",
  preview_text: "The offering left where no one sees it.",
  body: { type: "doc", content: [{ type: "paragraph" }] },
  recipient_kind: "all",
  send_mode: "draft",
  reply_to: "soror.alpha@protonmail.com",
};

const RECIPIENTS: NewsletterRecipientOption[] = [
  { kind: "all", label: "All subscribers", count_label: "38" },
  { kind: "tier", label: "A specific tier", count_label: "—" },
  { kind: "test", label: "A test list", count_label: "3" },
];

describe("NewsletterEditorSurface", () => {
  it("renders the headline + subject + preview text", () => {
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    expect(
      (container.querySelector("[data-headline]") as HTMLInputElement).value,
    ).toBe("What the dark moon asked");
    expect(
      (container.querySelector("[data-subject]") as HTMLInputElement).value,
    ).toBe("What the dark moon asked");
    expect(
      (container.querySelector("[data-preview-text]") as HTMLInputElement).value,
    ).toBe("The offering left where no one sees it.");
  });

  it("subject char count is a quiet stat with 60-char preview note", () => {
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    expect(
      container.querySelector("[data-subject-count]")?.textContent,
    ).toContain("/ 60");
    expect(
      container.querySelector("[data-subject-count]")?.textContent,
    ).toContain("good for previews");
  });

  it("subject longer than 60 chars switches the note to 'longer than most clients'", () => {
    const long = "x".repeat(80);
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={{ ...NEWSLETTER, subject: long }}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    expect(
      container.querySelector("[data-subject-count]")?.textContent,
    ).toContain("longer than most clients");
  });

  it("recipient radio changes fire onRecipientChange", () => {
    const onRecipientChange = vi.fn();
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
        onRecipientChange={onRecipientChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-recipient='test']") as HTMLLabelElement,
    );
    expect(onRecipientChange).toHaveBeenCalledWith("test");
  });

  it("selecting 'Send now' opens the confirm modal", () => {
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    expect(container.querySelector("[data-confirm-modal]")).toBeFalsy();
    fireEvent.click(
      container.querySelector(
        "[data-send-radio='send-now']",
      ) as HTMLElement,
    );
    expect(container.querySelector("[data-confirm-modal]")).toBeTruthy();
  });

  it("confirm modal shows recipient count + subject + preview", () => {
    const { container, getByText } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-send-radio='send-now']",
      ) as HTMLElement,
    );
    expect(getByText(/Send to 38 subscribers\?/)).toBeInTheDocument();
    expect(
      container.querySelector("[data-confirm-preview]")?.textContent,
    ).toContain("What the dark moon asked");
  });

  it("confirm modal uses --warn-soft (NEVER --danger)", () => {
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-send-radio='send-now']",
      ) as HTMLElement,
    );
    const header = container.querySelector(
      "[data-confirm-header]",
    ) as HTMLElement;
    expect(header.style.background).toContain("var(--warn-soft)");
    expect(header.style.background).not.toContain("var(--danger)");
  });

  it("Cancel ('Not yet') closes the confirm modal without firing onConfirmSend", () => {
    const onConfirmSend = vi.fn();
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
        onConfirmSend={onConfirmSend}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-send-radio='send-now']",
      ) as HTMLElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='cancel-send']",
      ) as HTMLButtonElement,
    );
    expect(container.querySelector("[data-confirm-modal]")).toBeFalsy();
    expect(onConfirmSend).not.toHaveBeenCalled();
  });

  it("Confirm CTA fires onConfirmSend + closes modal", () => {
    const onConfirmSend = vi.fn();
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
        onConfirmSend={onConfirmSend}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-send-radio='send-now']",
      ) as HTMLElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='confirm-send']",
      ) as HTMLButtonElement,
    );
    expect(onConfirmSend).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-confirm-modal]")).toBeFalsy();
  });

  it("test-send CTA fires onTestSend", () => {
    const onTestSend = vi.fn();
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
        onTestSend={onTestSend}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-action='test-send']") as HTMLButtonElement,
    );
    expect(onTestSend).toHaveBeenCalledTimes(1);
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <NewsletterEditorSurface
        newsletter={NEWSLETTER}
        recipients={RECIPIENTS}
        recipient_count={38}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
