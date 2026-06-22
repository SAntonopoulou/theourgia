import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SealEntryDialog } from "./SealEntryDialog.js";
import { VisibilityControl } from "./VisibilityControl.js";
import { VisibilityDowngradeDialog } from "./VisibilityDowngradeDialog.js";
import {
  VISIBILITY_DOWNGRADE_COPY,
  VISIBILITY_ORDER,
  isDowngrade,
  severityPalette,
  visibilityIndex,
} from "./visibility.js";

// ─── visibility helpers ────────────────────────────────────────────

describe("Visibility helpers", () => {
  it("VISIBILITY_ORDER is private → public", () => {
    expect(VISIBILITY_ORDER).toEqual([
      "personal",
      "viewer",
      "hub",
      "public",
    ]);
  });

  it("visibilityIndex monotone", () => {
    expect(visibilityIndex("personal")).toBe(0);
    expect(visibilityIndex("public")).toBe(3);
  });

  it("isDowngrade is true when target is more public", () => {
    expect(isDowngrade("personal", "viewer")).toBe(true);
    expect(isDowngrade("hub", "public")).toBe(true);
    expect(isDowngrade("public", "personal")).toBe(false);
    expect(isDowngrade("viewer", "viewer")).toBe(false);
  });

  it("severityPalette returns danger palette for public step", () => {
    expect(severityPalette("danger").primary).toBe("var(--danger)");
    expect(severityPalette("warn").primary).toBe("var(--warn)");
    expect(severityPalette("constructive").primary).toBe("var(--accent)");
  });

  it("VISIBILITY_DOWNGRADE_COPY public is the only danger-severity step", () => {
    expect(VISIBILITY_DOWNGRADE_COPY.public.severity).toBe("danger");
    expect(VISIBILITY_DOWNGRADE_COPY.public.emphasis).toMatch(
      /you cannot un-read it/,
    );
    expect(VISIBILITY_DOWNGRADE_COPY.viewer.severity).toBe("constructive");
    expect(VISIBILITY_DOWNGRADE_COPY.hub.severity).toBe("warn");
  });
});

// ─── VisibilityControl ─────────────────────────────────────────────

describe("VisibilityControl", () => {
  it("renders all four levels", () => {
    render(<VisibilityControl value="personal" />);
    ["Personal", "Viewer", "Hub", "Public"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("marks the active level with aria-pressed + data-visibility-active", () => {
    const { container } = render(<VisibilityControl value="hub" />);
    const active = container.querySelector(
      "[data-visibility-active='true']",
    );
    expect(active?.getAttribute("data-visibility-level")).toBe("hub");
  });

  it("fires onChange immediately when picking a MORE PRIVATE level", () => {
    const onChange = vi.fn();
    const onRequestDowngrade = vi.fn();
    render(
      <VisibilityControl
        value="public"
        onChange={onChange}
        onRequestDowngrade={onRequestDowngrade}
      />,
    );
    fireEvent.click(screen.getByText("Personal"));
    expect(onChange).toHaveBeenCalledWith("personal");
    expect(onRequestDowngrade).not.toHaveBeenCalled();
  });

  it("fires onRequestDowngrade — NOT onChange — when picking MORE PUBLIC", () => {
    const onChange = vi.fn();
    const onRequestDowngrade = vi.fn();
    render(
      <VisibilityControl
        value="personal"
        onChange={onChange}
        onRequestDowngrade={onRequestDowngrade}
      />,
    );
    fireEvent.click(screen.getByText("Hub"));
    expect(onRequestDowngrade).toHaveBeenCalledWith("hub");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking the current level is a no-op", () => {
    const onChange = vi.fn();
    const onRequestDowngrade = vi.fn();
    render(
      <VisibilityControl
        value="viewer"
        onChange={onChange}
        onRequestDowngrade={onRequestDowngrade}
      />,
    );
    fireEvent.click(screen.getByText("Viewer"));
    expect(onChange).not.toHaveBeenCalled();
    expect(onRequestDowngrade).not.toHaveBeenCalled();
  });

  it("disabled state suppresses all handlers", () => {
    const onChange = vi.fn();
    const onRequestDowngrade = vi.fn();
    render(
      <VisibilityControl
        value="hub"
        disabled
        onChange={onChange}
        onRequestDowngrade={onRequestDowngrade}
      />,
    );
    fireEvent.click(screen.getByText("Personal"));
    fireEvent.click(screen.getByText("Public"));
    expect(onChange).not.toHaveBeenCalled();
    expect(onRequestDowngrade).not.toHaveBeenCalled();
  });

  it("title attr communicates direction (more private / more public / current)", () => {
    render(<VisibilityControl value="viewer" />);
    expect(screen.getByText("Personal").closest("button")?.title).toMatch(
      /more private/i,
    );
    expect(screen.getByText("Hub").closest("button")?.title).toMatch(
      /more public/i,
    );
    expect(screen.getByText("Viewer").closest("button")?.title).toBe(
      "Current",
    );
  });

  it("attaches structural data attributes", () => {
    const { container } = render(<VisibilityControl value="hub" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("visibility-control");
    expect(root.getAttribute("data-value")).toBe("hub");
  });
});

// ─── VisibilityDowngradeDialog ────────────────────────────────────

describe("VisibilityDowngradeDialog", () => {
  it("renders the verbatim title + body for each target", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <VisibilityDowngradeDialog
        open
        target="viewer"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByText("Make this visible to your viewers?"),
    ).toBeInTheDocument();

    rerender(
      <VisibilityDowngradeDialog
        open
        target="hub"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByText("Share with hub members?"),
    ).toBeInTheDocument();

    rerender(
      <VisibilityDowngradeDialog
        open
        target="public"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByText("Publish to your public site?"),
    ).toBeInTheDocument();
  });

  it("public step renders the 'cannot un-read it' emphasis verbatim", () => {
    render(
      <VisibilityDowngradeDialog
        open
        target="public"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByText(/you cannot un-read it/),
    ).toBeInTheDocument();
  });

  it("public step uses role=alertdialog + data-severity=danger", () => {
    render(
      <VisibilityDowngradeDialog
        open
        target="public"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const dlg = screen.getByRole("alertdialog");
    expect(dlg).toBeInTheDocument();
    const inner = dlg.querySelector("[data-component='visibility-downgrade-dialog']");
    expect(inner?.getAttribute("data-severity")).toBe("danger");
  });

  it("non-danger steps use role=dialog", () => {
    render(
      <VisibilityDowngradeDialog
        open
        target="viewer"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("entryCount > 1 prefixes the body with 'N entries will change together'", () => {
    render(
      <VisibilityDowngradeDialog
        open
        target="hub"
        entryCount={3}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByText(/3 entries will change together/),
    ).toBeInTheDocument();
  });

  it("fires onConfirm and onCancel from the action buttons", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <VisibilityDowngradeDialog
        open
        target="hub"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-confirm-button]") as HTMLElement,
    );
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Keep private"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not render when open=false", () => {
    render(
      <VisibilityDowngradeDialog
        open={false}
        target="public"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByText("Publish to your public site?"),
    ).toBeNull();
  });
});

// ─── SealEntryDialog ───────────────────────────────────────────────

describe("SealEntryDialog", () => {
  it("renders single-mode title + body when entryTitle is provided", () => {
    render(
      <SealEntryDialog
        open
        entryTitle="Hymn to Hekate (working draft)"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Seal this entry?")).toBeInTheDocument();
    // The title appears in the body, the prompt, and the input placeholder.
    expect(
      screen.getAllByText(/Hymn to Hekate \(working draft\)/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders bulk-mode title with the count when no entryTitle", () => {
    render(
      <SealEntryDialog
        open
        entryCount={4}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Seal 4 entries?")).toBeInTheDocument();
  });

  it("renders the irrevocable-emphasis line verbatim", () => {
    render(
      <SealEntryDialog
        open
        entryTitle="Anything"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByText(/This cannot be undone\./),
    ).toBeInTheDocument();
  });

  it("confirm button disabled until the right confirm string is typed (single)", () => {
    const onConfirm = vi.fn();
    render(
      <SealEntryDialog
        open
        entryTitle="My entry"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByText("Seal entry");
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    const input = screen.getByLabelText("Confirmation text");
    fireEvent.change(input, { target: { value: "My entry" } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("bulk mode requires typing exactly SEAL", () => {
    const onConfirm = vi.fn();
    render(
      <SealEntryDialog
        open
        entryCount={3}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByText("Seal 3 entries");
    expect(confirm).toBeDisabled();
    const input = screen.getByLabelText("Confirmation text");
    fireEvent.change(input, { target: { value: "seal" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "SEAL" } });
    expect(confirm).not.toBeDisabled();
  });

  it("uses --seal palette (no --danger)", () => {
    render(
      <SealEntryDialog
        open
        entryTitle="t"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const root = document.querySelector(
      "[data-component='seal-entry-dialog']",
    ) as HTMLElement;
    expect(root.outerHTML).not.toContain("--danger");
    expect(root.outerHTML).toContain("--seal");
  });

  it("resets the typed input when the dialog closes and reopens", () => {
    const { rerender } = render(
      <SealEntryDialog
        open
        entryTitle="My entry"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText("Confirmation text") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My entry" } });
    expect(input.value).toBe("My entry");
    rerender(
      <SealEntryDialog
        open={false}
        entryTitle="My entry"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    rerender(
      <SealEntryDialog
        open
        entryTitle="My entry"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const reopened = screen.getByLabelText(
      "Confirmation text",
    ) as HTMLInputElement;
    expect(reopened.value).toBe("");
  });

  it("attaches structural data attributes", () => {
    render(
      <SealEntryDialog
        open
        entryCount={2}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const root = document.querySelector("[data-component='seal-entry-dialog']");
    expect(root?.getAttribute("data-mode")).toBe("bulk");
  });
});
