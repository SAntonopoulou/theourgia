import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import {
  MemorialModeSurface,
  type MemorialConfig,
} from "./MemorialModeSurface.js";

function makeConfig(overrides: Partial<MemorialConfig> = {}): MemorialConfig {
  return {
    id: "cfg1",
    owner_id: "u1",
    check_in_cadence_days: 180,
    warning_window_days: 30,
    last_check_in_at: "2026-06-01T00:00:00Z",
    executor_name: "",
    executor_email: "",
    memorial_message: "",
    posthumous_publications_enabled: false,
    memorialized_at: null,
    state: "active",
    days_until_warning: 100,
    days_until_pending: 130,
    ...overrides,
  };
}

describe("MemorialModeSurface", () => {
  it("renders the active status headline", () => {
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig()}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    const status = container.querySelector('[data-role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute("data-state")).toBe("active");
    expect(container.textContent).toContain("This vault is active");
  });

  it("shows the check-in button when not memorialized", () => {
    const onCheckIn = vi.fn();
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig()}
        onCheckIn={onCheckIn}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    const btn = container.querySelector(
      '[data-role="check-in"]',
    ) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(onCheckIn).toHaveBeenCalledTimes(1);
  });

  it("shows the reactivate button when memorialized", () => {
    const onReactivate = vi.fn();
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig({
          state: "memorialized",
          memorialized_at: "2026-07-01T00:00:00Z",
        })}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={onReactivate}
      />,
    );
    const reactivate = container.querySelector(
      '[data-role="reactivate"]',
    ) as HTMLButtonElement;
    fireEvent.click(reactivate);
    expect(onReactivate).toHaveBeenCalledTimes(1);
    // Check-in NOT shown when memorialized.
    expect(container.querySelector('[data-role="check-in"]')).toBeNull();
  });

  it("hides the config form when memorialized", () => {
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig({
          state: "memorialized",
          memorialized_at: "2026-07-01T00:00:00Z",
        })}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-role="config"]')).toBeNull();
  });

  it("save button passes the composed patch to onSave", () => {
    const onSave = vi.fn();
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig()}
        onCheckIn={vi.fn()}
        onSave={onSave}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Save settings",
    ) as HTMLButtonElement;
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    const patch = onSave.mock.calls[0]![0];
    expect(patch.check_in_cadence_days).toBe(180);
    expect(patch.warning_window_days).toBe(30);
    // Empty strings become null for optional executor + message fields.
    expect(patch.executor_name).toBeNull();
    expect(patch.memorial_message).toBeNull();
  });

  it("warning state renders the care-toned countdown", () => {
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig({
          state: "warning",
          days_until_warning: 0,
          days_until_pending: 15,
        })}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Time to check in soon");
    expect(container.textContent).toContain("15 days");
  });

  it("trigger button fires onTrigger", () => {
    const onTrigger = vi.fn();
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig()}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={onTrigger}
        onReactivate={vi.fn()}
      />,
    );
    const trigger = container.querySelector(
      '[data-role="trigger"]',
    ) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("no-check-in-yet renders human-readable placeholder", () => {
    const { container } = render(
      <MemorialModeSurface
        config={makeConfig({ last_check_in_at: null })}
        onCheckIn={vi.fn()}
        onSave={vi.fn()}
        onTrigger={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("not yet");
  });
});
