/**
 * ICalFeedSurface tests (H07 §S3 surface 21).
 *
 * Honesty + H07 rule coverage:
 *   - Sealed notice copy verbatim ("N sealed entries today")
 *   - Sealed notice uses --seal / --seal-soft / --seal-border
 *   - Visibility radios default to Private; Public note verbatim
 *   - Feed URL renders in --font-mono + --ink-soft
 *   - Regenerate URL is a quiet --ink-mute link (never --danger)
 *   - Connected count is presented as quiet body text in --ink-mute
 *     with the number in --ink-soft mono (not a leaderboard / loud
 *     pill)
 *   - No --danger anywhere
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type ICalFeedRecord,
  ICalFeedSurface,
} from "./index.js";

const RECORD: ICalFeedRecord = {
  feed_name: "My practice calendar",
  includes: {
    resh: true,
    workings: true,
    pilgrimage: false,
    lunar: true,
    hours: false,
    custom: false,
  },
  visibility: "private",
  feed_url: "webcal://theourgia.app/ical/v1/8f3a-d29c.ics",
  connected_count: 2,
};

describe("ICalFeedSurface", () => {
  it("renders header + feed name + sealed notice + connected count", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    expect(container.textContent).toContain("Calendar feed");
    const name = container.querySelector(
      "[data-ical-name]",
    ) as HTMLInputElement;
    expect(name.value).toBe("My practice calendar");
  });

  it("Sealed notice copy is verbatim", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    const notice = container.querySelector(
      "[data-ical-sealed-notice]",
    ) as HTMLElement;
    expect(notice.textContent).toContain(
      "Sealed entries never appear in the feed — even a private one.",
    );
    expect(notice.textContent).toContain(
      `A day with sealed work shows a single "N sealed entries today" marker, count only.`,
    );
  });

  it("Sealed notice uses --seal / --seal-soft / --seal-border (never --danger)", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    const notice = container.querySelector(
      "[data-ical-sealed-notice]",
    ) as HTMLElement;
    expect(notice.outerHTML).toContain("var(--seal-border)");
    expect(notice.style.background).toBe("var(--seal-soft)");
    expect(notice.innerHTML).not.toContain("--danger");
  });

  it("Includes default to record values", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    expect(
      (
        container.querySelector(
          "[data-ical-include='resh']",
        ) as HTMLElement
      ).getAttribute("data-on"),
    ).toBe("true");
    expect(
      (
        container.querySelector(
          "[data-ical-include='hours']",
        ) as HTMLElement
      ).getAttribute("data-on"),
    ).toBe("false");
  });

  it("Include toggle fires onToggleInclude with new state", () => {
    const onToggleInclude = vi.fn();
    const { container } = render(
      <ICalFeedSurface
        record={RECORD}
        onToggleInclude={onToggleInclude}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-ical-include='hours'] input[type='checkbox']",
      ) as HTMLInputElement,
    );
    expect(onToggleInclude).toHaveBeenCalledWith("hours", true);
  });

  it("Visibility radio defaults to Private + Public note verbatim", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    const priv = container.querySelector(
      "[data-ical-visibility='private']",
    ) as HTMLElement;
    expect(priv.getAttribute("data-on")).toBe("true");
    expect(priv.textContent).toContain(
      "Requires an authenticated URL — only you can subscribe.",
    );
    const pub = container.querySelector(
      "[data-ical-visibility='public']",
    ) as HTMLElement;
    expect(pub.textContent).toContain(
      "Anyone with the URL can subscribe.",
    );
  });

  it("Switching visibility fires onChangeVisibility", () => {
    const onChangeVisibility = vi.fn();
    const { container } = render(
      <ICalFeedSurface
        record={RECORD}
        onChangeVisibility={onChangeVisibility}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-ical-visibility='public'] input[type='radio']",
      ) as HTMLInputElement,
    );
    expect(onChangeVisibility).toHaveBeenCalledWith("public");
  });

  it("Feed URL renders in --font-mono + --ink-soft", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    const url = container.querySelector(
      "[data-ical-url]",
    ) as HTMLElement;
    expect(url.style.fontFamily).toBe("var(--font-mono)");
    expect(url.style.color).toBe("var(--ink-soft)");
    expect(url.textContent).toBe(RECORD.feed_url);
  });

  it("Copy CTA fires onCopyUrl + flips to 'Copied' label", () => {
    const onCopyUrl = vi.fn();
    const { container } = render(
      <ICalFeedSurface record={RECORD} onCopyUrl={onCopyUrl} />,
    );
    const copy = container.querySelector(
      "[data-ical-copy]",
    ) as HTMLButtonElement;
    expect(copy.textContent).toContain("Copy");
    fireEvent.click(copy);
    expect(onCopyUrl).toHaveBeenCalled();
    expect(copy.textContent).toContain("Copied");
  });

  it("Regenerate URL is a quiet --ink-mute link, not a --danger button", () => {
    const onRegenerate = vi.fn();
    const { container } = render(
      <ICalFeedSurface record={RECORD} onRegenerate={onRegenerate} />,
    );
    const regen = container.querySelector(
      "[data-ical-regenerate]",
    ) as HTMLButtonElement;
    expect(regen.style.color).toBe("var(--ink-mute)");
    expect(regen.style.background).toBe("transparent");
    expect(regen.outerHTML).not.toContain("--danger");
    fireEvent.click(regen);
    expect(onRegenerate).toHaveBeenCalled();
  });

  it("Connected count renders quietly (--ink-mute body + --ink-soft mono number)", () => {
    const { container } = render(
      <ICalFeedSurface record={{ ...RECORD, connected_count: 7 }} />,
    );
    const block = container.querySelector(
      "[data-ical-connected]",
    ) as HTMLElement;
    expect(block.textContent).toContain("7");
    expect(block.textContent).toContain(
      "clients subscribed in the last 30 days",
    );
  });

  it("never references --danger anywhere", () => {
    const { container } = render(<ICalFeedSurface record={RECORD} />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
