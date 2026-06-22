import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BulkActionBar } from "./BulkActionBar.js";

describe("BulkActionBar", () => {
  it("renders the selection label", () => {
    render(<BulkActionBar label="3 selected" />);
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("renders caller-provided actions", () => {
    render(
      <BulkActionBar
        label="2 selected"
        actions={
          <>
            <button>Add tag</button>
            <button>Change visibility</button>
          </>
        }
      />,
    );
    expect(screen.getByText("Add tag")).toBeInTheDocument();
    expect(screen.getByText("Change visibility")).toBeInTheDocument();
  });

  it("calls onClear when the close button is clicked", () => {
    const onClear = vi.fn();
    render(<BulkActionBar label="1 selected" onClear={onClear} />);
    fireEvent.click(screen.getByLabelText("Clear selection"));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("supports a custom clearLabel", () => {
    render(
      <BulkActionBar
        label="1 selected"
        onClear={() => {}}
        clearLabel="Cancel batch"
      />,
    );
    expect(screen.getByLabelText("Cancel batch")).toBeInTheDocument();
  });

  it("hides the close button when no onClear handler is supplied", () => {
    const { container } = render(<BulkActionBar label="1 selected" />);
    expect(container.querySelector("[data-clear-button]")).toBeNull();
  });

  it("uses role=region with an accessible name", () => {
    const { container } = render(<BulkActionBar label="3 selected" />);
    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-label")).toBe("Bulk actions");
  });

  it("announces the count via aria-live=polite", () => {
    const { container } = render(<BulkActionBar label="3 selected" />);
    const live = container.querySelector("[data-selection-label]");
    expect(live?.getAttribute("aria-live")).toBe("polite");
  });

  it("attaches data-position attribute", () => {
    const { container, rerender } = render(
      <BulkActionBar label="1 selected" />,
    );
    expect(container.firstElementChild?.getAttribute("data-position")).toBe(
      "bottom",
    );
    rerender(<BulkActionBar label="1 selected" position="top" />);
    expect(container.firstElementChild?.getAttribute("data-position")).toBe(
      "top",
    );
  });

  it("hides the divider when no actions are supplied", () => {
    const { container } = render(<BulkActionBar label="1 selected" />);
    expect(container.querySelector("[data-bulk-actions]")).toBeNull();
  });
});
