/**
 * PublicationSettingsSurface tests (H07 §S3 surface 6).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PublicationSettingsRecord,
  PublicationSettingsSurface,
} from "./index.js";

function makeRecord(): PublicationSettingsRecord {
  return {
    id: "p1",
    title: "Walking the Crossroads",
    slug: "crossroads",
    slug_prefix: "/walking-the-",
    authors: [{ id: "id-1", label: "Soror Ευ. Α." }],
    summary: "A practitioner's record of three years keeping the lamp.",
    cover_url: null,
    schedule: { mode: "now" },
    distribution: {
      catalog: true,
      rss: true,
      activity_pub: false,
      newsletter: false,
    },
    tags: ["Hekate", "crossroads"],
    tradition_tags: ["hellenic"],
    total_word_count: 8400,
  };
}

const AUTHORS = [
  { id: "id-1", label: "Soror Ευ. Α." },
  { id: "id-2", label: "Frater K." },
];

describe("PublicationSettingsSurface", () => {
  it("renders all five section headings", () => {
    render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Cover & summary")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("Discoverability")).toBeInTheDocument();
  });

  it("title edit fires onChange with the new title", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-ps-title]") as HTMLInputElement,
      { target: { value: "New title" } },
    );
    expect(onChange).toHaveBeenCalledWith({ title: "New title" });
  });

  it("slug input coerces to URL-safe characters as the user types", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-ps-slug]") as HTMLInputElement,
      { target: { value: "Hekate's CROSS-Roads!" } },
    );
    expect(onChange).toHaveBeenCalled();
    const lastCall =
      onChange.mock.calls[onChange.mock.calls.length - 1]![0];
    expect(lastCall.slug).toBe("hekates-cross-roads");
  });

  it("renders the slug `‡` 'URLs are stable forever' note", () => {
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    expect(container.querySelector("[data-ps-slug-note]")?.textContent).toContain(
      "URLs are stable forever",
    );
  });

  it("opens the author picker and adds a co-author", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-ps-add-author]") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-author-id='id-2']") as HTMLButtonElement,
    );
    expect(onChange).toHaveBeenCalledWith({
      authors: [
        { id: "id-1", label: "Soror Ευ. Α." },
        { id: "id-2", label: "Frater K." },
      ],
    });
  });

  it("summary char count + reading time render as quiet stats", () => {
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    expect(
      container.querySelector("[data-ps-summary-count]")?.textContent,
    ).toContain("/ 240");
    expect(
      container.querySelector("[data-ps-reading-time]")?.textContent,
    ).toContain("min read");
  });

  it("schedule 'later' radio reveals the datetime picker", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    expect(container.querySelector("[data-ps-schedule-at]")).toBeFalsy();
    fireEvent.click(
      container.querySelector(
        "[data-schedule-mode='later']",
      ) as HTMLElement,
    );
    expect(onChange).toHaveBeenCalled();
    const lastCall =
      onChange.mock.calls[onChange.mock.calls.length - 1]![0];
    expect(lastCall.schedule).toMatchObject({ mode: "later" });
  });

  it("ActivityPub distribution row is disabled with the Phase 12 note", () => {
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    const row = container.querySelector(
      "[data-distribution='activity_pub']",
    ) as HTMLLabelElement;
    expect(row.style.cursor).toBe("not-allowed");
    expect(row.textContent).toContain("Available when Federation ships");
  });

  it("clicking a distribution checkbox toggles via onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-checkbox='newsletter']",
      ) as HTMLElement,
    );
    expect(onChange).toHaveBeenCalledWith({
      distribution: {
        catalog: true,
        rss: true,
        activity_pub: false,
        newsletter: true,
      },
    });
  });

  it("ActivityPub checkbox does NOT toggle when clicked (disabled)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-checkbox='activity_pub']",
      ) as HTMLElement,
    );
    // No distribution change should have been emitted.
    const dist = onChange.mock.calls.find((c) => "distribution" in c[0]);
    expect(dist).toBeUndefined();
  });

  it("tag input + Enter fires onChange with new tags array", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
        onChange={onChange}
      />,
    );
    const input = container.querySelector(
      "[data-ps-tag-input]",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "lamp" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({
      tags: ["Hekate", "crossroads", "lamp"],
    });
  });

  it("tradition tags vs free-text tags are kept distinct in the UI", () => {
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    const free = container.querySelector("[data-ps-tags]");
    const trad = container.querySelector("[data-ps-traditions]");
    expect(free?.textContent).toContain("Hekate");
    expect(free?.textContent).not.toContain("Hellenic");
    expect(trad?.textContent).toContain("Hellenic");
    expect(trad?.textContent).not.toContain("Hekate");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <PublicationSettingsSurface
        publication={makeRecord()}
        availableAuthors={AUTHORS}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
