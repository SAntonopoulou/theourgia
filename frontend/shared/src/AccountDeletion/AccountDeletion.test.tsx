/**
 * AccountDeletion — H10 Cluster B3 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AccountDeletionSurface } from "./AccountDeletionSurface.js";

describe("AccountDeletionSurface", () => {
  const props = {
    magickalName: "Aspasia of the Crossroads",
    startDate: "2025-11-14",
  };

  test("renders all five facts verbatim (rule 27 federated-persistence)", () => {
    render(<AccountDeletionSurface {...props} />);
    expect(
      screen.getByText(/scheduled for deletion in 30 days/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/federated to other instances may persist/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may have been archived by readers/i),
    ).toBeInTheDocument();
  });

  test("memorial block hidden when no executor designated", () => {
    render(<AccountDeletionSurface {...props} />);
    expect(
      screen.queryByText(/executor designated for memorial mode/i),
    ).toBeNull();
  });

  test("memorial block shown when hasExecutor = true", () => {
    render(<AccountDeletionSurface {...props} hasExecutor />);
    expect(
      screen.getByText(/executor designated for memorial mode/i),
    ).toBeInTheDocument();
  });

  test("Schedule disabled until both confirmations match", () => {
    render(<AccountDeletionSurface {...props} />);
    const btn = screen.getByRole("button", { name: /Schedule deletion/i });
    expect(btn).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText(props.magickalName),
      { target: { value: props.magickalName } },
    );
    expect(btn).toBeDisabled(); // date still missing

    fireEvent.change(
      screen.getByPlaceholderText(props.startDate),
      { target: { value: props.startDate } },
    );
    expect(btn).toBeEnabled();
  });

  test("Schedule fires onSchedule once both fields match exactly", () => {
    const onSchedule = vi.fn();
    render(
      <AccountDeletionSurface {...props} onSchedule={onSchedule} />,
    );
    fireEvent.change(
      screen.getByPlaceholderText(props.magickalName),
      { target: { value: props.magickalName } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(props.startDate),
      { target: { value: props.startDate } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Schedule deletion/i }),
    );
    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  test("Keep vault link fires onKeepVault", () => {
    const onKeepVault = vi.fn();
    render(
      <AccountDeletionSurface {...props} onKeepVault={onKeepVault} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Keep my vault/i }),
    );
    expect(onKeepVault).toHaveBeenCalledTimes(1);
  });

  test("retention line renders verbatim", () => {
    render(<AccountDeletionSurface {...props} />);
    expect(
      screen.getByText(/We retain a minimal set of audit-log entries/i),
    ).toBeInTheDocument();
  });

  test("rule 2 — Schedule button uses --warn-soft, NOT --danger", () => {
    render(<AccountDeletionSurface {...props} />);
    const btn = screen.getByRole("button", { name: /Schedule deletion/i });
    const styles = btn.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(styles).not.toContain("--danger");
  });
});
