import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AutoStampChip } from "./index.js";

describe("AutoStampChip", () => {
  it("collapsed by default; renders both astro + calendar joined by middot", () => {
    render(
      <AutoStampChip
        astro="Sun ☉ Gemini · dark moon"
        calendar="24 Sivan 5786"
      />,
    );
    const chip = screen.getByRole("button");
    expect(chip.textContent).toContain("Sun ☉ Gemini · dark moon · 24 Sivan 5786");
    expect(chip.getAttribute("aria-expanded")).toBe("false");
  });

  it("returns null when both astro + calendar absent (no collapsedLabel)", () => {
    const { container } = render(<AutoStampChip />);
    expect(container.firstChild).toBeNull();
  });

  it("clicking the chip expands to a labelled card", async () => {
    render(
      <AutoStampChip
        astro="Sun ☉ Gemini"
        calendar="24 Sivan 5786"
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Auto-stamp")).toBeInTheDocument();
    expect(screen.getByText("Astro")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Collapse")).toBeInTheDocument();
  });

  it("Collapse button returns to the chip form", async () => {
    render(
      <AutoStampChip astro="Sun ☉ Gemini" calendar="24 Sivan 5786" />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Collapse"));
    // Back to single chip — only one button.
    expect(screen.queryByText("Auto-stamp")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders only astro when calendar is absent", () => {
    render(<AutoStampChip astro="Sun ☉ Gemini · dark moon" />);
    expect(screen.getByRole("button").textContent).toContain(
      "Sun ☉ Gemini · dark moon",
    );
    expect(screen.getByRole("button").textContent).not.toContain("undefined");
  });

  it("renders only calendar when astro is absent", () => {
    render(<AutoStampChip calendar="24 Sivan 5786" />);
    expect(screen.getByRole("button").textContent).toContain("24 Sivan 5786");
  });

  it("honors collapsedLabel override", () => {
    render(
      <AutoStampChip
        astro="x"
        calendar="y"
        collapsedLabel="Custom Label"
      />,
    );
    expect(screen.getByRole("button").textContent).toContain("Custom Label");
  });

  it("expanded view only shows the lines that are present", async () => {
    render(<AutoStampChip astro="Sun in Gemini" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Astro")).toBeInTheDocument();
    expect(screen.queryByText("Calendar")).toBeNull();
  });

  it("title attribute carries full text for hover preview when truncated", () => {
    render(
      <AutoStampChip
        astro="Sun ☉ Gemini · dark moon · planetary hour of Saturn"
        calendar="24 Sivan 5786 · 1 Tammuz 5786"
      />,
    );
    const chip = screen.getByRole("button");
    expect(chip.getAttribute("title")).toContain("Sun ☉ Gemini");
    expect(chip.getAttribute("title")).toContain("Sivan");
  });
});
