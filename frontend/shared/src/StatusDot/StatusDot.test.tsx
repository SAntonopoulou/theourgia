import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusDot } from "./index.js";

describe("StatusDot", () => {
  it("renders the label text alongside the dot", () => {
    render(<StatusDot status="ok" label="Operational" />);
    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  it("exposes status via data-status", () => {
    const { container } = render(<StatusDot status="error" label="Down" />);
    expect(container.firstChild).toHaveAttribute("data-status", "error");
  });

  it.each([
    ["ok", "var(--success)"],
    ["warn", "var(--warning)"],
    ["error", "var(--danger)"],
    ["pending", "var(--info)"],
    ["neutral", "var(--ink-mute)"],
  ])("status=%s uses the right dot color", (status, color) => {
    const { container } = render(
      <StatusDot status={status as "ok" | "warn" | "error" | "pending" | "neutral"} label="x" />,
    );
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.backgroundColor).toBe(color);
  });
});
