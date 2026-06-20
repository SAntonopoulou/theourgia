import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Menu, type MenuItem } from "./index.js";

const baseItems = (handlers?: { onArchive?: () => void; onDelete?: () => void }): MenuItem[] => [
  { kind: "label", label: "Actions" },
  { kind: "item", label: "Archive", glyph: "scroll", onSelect: handlers?.onArchive ?? (() => {}) },
  { kind: "item", label: "Duplicate", onSelect: () => {} },
  { kind: "separator" },
  {
    kind: "item",
    label: "Delete",
    tone: "danger",
    onSelect: handlers?.onDelete ?? (() => {}),
  },
];

describe("Menu", () => {
  it("opens on trigger click + closes on item select", async () => {
    const onArchive = vi.fn();
    render(<Menu items={baseItems({ onArchive })} trigger={<button type="button">Open</button>} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).toBeNull();
  });

  it("renders separator + label as non-interactive elements", async () => {
    render(<Menu items={baseItems()} trigger={<button type="button">Open</button>} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("ArrowDown moves between menuitems (skipping separators / labels)", async () => {
    render(<Menu items={baseItems()} trigger={<button type="button">Open</button>} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    // First action is focused on open.
    const archive = screen.getByRole("menuitem", { name: "Archive" });
    const duplicate = screen.getByRole("menuitem", { name: "Duplicate" });
    const del = screen.getByRole("menuitem", { name: "Delete" });
    expect(archive).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(duplicate).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(del).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(archive).toHaveFocus();
  });

  it("ArrowUp wraps to last item", async () => {
    render(<Menu items={baseItems()} trigger={<button type="button">Open</button>} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("End and Home jump to last and first respectively", async () => {
    render(<Menu items={baseItems()} trigger={<button type="button">Open</button>} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus();
  });

  it("danger-toned item is colored with var(--danger)", async () => {
    render(<Menu items={baseItems()} trigger={<button type="button">Open</button>} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menuitem", { name: "Delete" }).style.color).toBe("var(--danger)");
  });

  it("disabled item ignores select", async () => {
    const onSelect = vi.fn();
    const items: MenuItem[] = [
      { kind: "item", label: "X", onSelect, disabled: true },
      { kind: "item", label: "Y", onSelect: () => {} },
    ];
    render(<Menu items={items} trigger={<button type="button">Open</button>} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("menuitem", { name: "X" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
