import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  type ChosenItem,
  ItemsComposer,
  OFFERING_ITEMS,
} from "./index.js";

function Harness({ initial = [] as ChosenItem[] }) {
  const [value, setValue] = useState<ChosenItem[]>(initial);
  return <ItemsComposer value={value} onChange={setValue} />;
}

describe("ItemsComposer", () => {
  it("renders all 14 canonical offering chips by default", () => {
    render(<Harness />);
    for (const item of OFFERING_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("clicking a chip adds it to the chosen list", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Wine"));
    expect(screen.getByLabelText("Chosen items")).toBeInTheDocument();
    // The chosen-list label is rendered inside the row + the chip stays on
    const wineRow = screen
      .getByLabelText("Chosen items")
      .querySelector("li") as HTMLElement;
    expect(wineRow.textContent).toContain("Wine");
  });

  it("clicking an already-on chip removes it", async () => {
    render(<Harness initial={[{ k: "wine", qty: "", unit: "" }]} />);
    const user = userEvent.setup();
    const wineChip = screen.getAllByText("Wine")[0].closest("button")!;
    expect(wineChip.getAttribute("aria-pressed")).toBe("true");
    await user.click(wineChip);
    // After removal, the chosen-list disappears (no items left).
    expect(screen.queryByLabelText("Chosen items")).toBeNull();
  });

  it("qty + unit inputs edit the corresponding chosen item", async () => {
    render(<Harness initial={[{ k: "wine", qty: "", unit: "" }]} />);
    const user = userEvent.setup();
    const qty = screen.getByLabelText("Wine quantity") as HTMLInputElement;
    const unit = screen.getByLabelText("Wine unit") as HTMLInputElement;
    await user.type(qty, "1");
    await user.type(unit, "cup");
    expect(qty.value).toBe("1");
    expect(unit.value).toBe("cup");
  });

  it("remove button removes the chosen item", async () => {
    render(<Harness initial={[{ k: "wine", qty: "1", unit: "cup" }]} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Remove Wine"));
    expect(screen.queryByLabelText("Wine quantity")).toBeNull();
  });

  it("custom-text + Enter appends a custom item", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const input = screen.getByLabelText(
      "Add a custom item",
    ) as HTMLInputElement;
    await user.type(input, "myrrh{Enter}");
    expect(screen.getByText("(custom)")).toBeInTheDocument();
    expect(screen.getByText("Myrrh")).toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("custom-text + Add button also appends", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add a custom item"), "dittany");
    await user.click(screen.getByText("Add"));
    expect(screen.getByText("Dittany")).toBeInTheDocument();
  });

  it("Add button stays disabled while input is empty", () => {
    render(<Harness />);
    const addButton = screen.getByText("Add") as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it("custom-text adding a kind that already exists is a no-op", async () => {
    render(<Harness initial={[{ k: "wine", qty: "", unit: "" }]} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add a custom item"), "wine{Enter}");
    // Still exactly one Wine row.
    expect(screen.getAllByText("Wine")).toHaveLength(2); // 1 chip + 1 chosen
  });

  it("category dot uses the right --cat-* token per item", async () => {
    const { container } = render(<Harness />);
    const wineChip = screen.getByText("Wine").closest("button")!;
    const dot = wineChip.querySelector("span") as HTMLElement;
    expect(dot.style.background).toBe("var(--cat-liquid)");
    const incenseChip = screen.getByText("Incense").closest("button")!;
    expect(
      (incenseChip.querySelector("span") as HTMLElement).style.background,
    ).toBe("var(--cat-solid)");
  });

  it("commonKinds override changes the palette", () => {
    const Custom = () => {
      const [value, setValue] = useState<ChosenItem[]>([]);
      return (
        <ItemsComposer
          value={value}
          onChange={setValue}
          commonKinds={[{ k: "vapor", label: "Vapor", cat: "body" }]}
        />
      );
    };
    render(<Custom />);
    expect(screen.getByText("Vapor")).toBeInTheDocument();
    expect(screen.queryByText("Wine")).toBeNull();
  });
});
