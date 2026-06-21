import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  RECEPTION_LEVELS,
  type ReceptionLevel,
  ReceptionSelector,
} from "./index.js";

function Harness({ initial = "clear" as ReceptionLevel }) {
  const [value, setValue] = useState<ReceptionLevel>(initial);
  return <ReceptionSelector value={value} onChange={setValue} showHint />;
}

describe("ReceptionSelector", () => {
  it("renders all 5 levels in canonical order", () => {
    render(<Harness />);
    const labels = RECEPTION_LEVELS.map((r) => r.label);
    expect(labels).toEqual([
      "None",
      "Faint",
      "Clear",
      "Strong",
      "Overwhelming",
    ]);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("active pill has aria-checked=true; others false", () => {
    render(<Harness initial="strong" />);
    const strong = screen.getByText("Strong").closest("button")!;
    const none = screen.getByText("None").closest("button")!;
    expect(strong.getAttribute("aria-checked")).toBe("true");
    expect(none.getAttribute("aria-checked")).toBe("false");
  });

  it("clicking a pill updates the value", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Overwhelming"));
    expect(
      screen
        .getByText("Overwhelming")
        .closest("button")!
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("data-level attribute uses the canonical key", () => {
    render(<Harness initial="faint" />);
    const faint = screen.getByText("Faint").closest("button")!;
    expect(faint.dataset.level).toBe("faint");
  });

  it("active pill uses its --rc-* token color on the glyph", () => {
    render(<Harness initial="clear" />);
    const clear = screen.getByText("Clear").closest("button")!;
    const glyphHolder = clear.querySelector("span") as HTMLElement;
    expect(glyphHolder.style.color).toBe("var(--rc-clear)");
  });

  it("'None is information too' hint is the canonical voice", () => {
    render(<Harness initial="none" />);
    expect(
      screen.getByText(/No reception is information too/i),
    ).toBeInTheDocument();
  });

  it("each level's hint is unique and stays in voice", () => {
    const levels: ReceptionLevel[] = [
      "none",
      "faint",
      "clear",
      "strong",
      "overwhelming",
    ];
    for (const level of levels) {
      const { unmount } = render(<Harness initial={level} />);
      // Sentinels match a phrase unique to each hint — never the
      // button labels — so "Overwhelming" the label doesn't collide
      // with the "Overwhelming. Rare; …" hint.
      const sentinel: Record<ReceptionLevel, RegExp> = {
        none: /No reception is information too/i,
        faint: /faint sense/i,
        clear: /clear reception/i,
        strong: /Strongly felt/i,
        overwhelming: /Rare; record what made it so/i,
      };
      expect(screen.getByText(sentinel[level])).toBeInTheDocument();
      unmount();
    }
  });

  it("never uses --danger / --warning tokens (care palette only)", () => {
    render(<Harness initial="none" />);
    const none = screen.getByText("None").closest("button")!;
    const glyph = none.querySelector("span") as HTMLElement;
    expect(glyph.style.color).not.toContain("danger");
    expect(glyph.style.color).not.toContain("warning");
  });

  it("role=radiogroup with aria-label for SR", () => {
    const { container } = render(<Harness />);
    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.getAttribute("aria-label")).toBe("Reception perceived");
  });
});
