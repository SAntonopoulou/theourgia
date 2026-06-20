import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Banner } from "./index.js";

describe("Banner", () => {
  it("renders title + body + glyph", () => {
    const { container } = render(<Banner tone="info" title="Offline mode" body="Sync paused." />);
    expect(screen.getByText("Offline mode")).toBeInTheDocument();
    expect(screen.getByText("Sync paused.")).toBeInTheDocument();
    expect(container.querySelector("use")?.getAttribute("href")).toBe("#theo-scroll");
  });

  it.each([
    ["info", "status"],
    ["success", "status"],
    ["warning", "alert"],
    ["danger", "alert"],
  ] as const)("tone=%s sets role=%s", (tone, role) => {
    render(<Banner tone={tone} title="x" />);
    expect(screen.getByRole(role)).toBeInTheDocument();
  });

  it("exposes tone via data-tone", () => {
    const { container } = render(<Banner tone="warning" title="x" />);
    expect(container.firstChild).toHaveAttribute("data-tone", "warning");
  });

  it("dismissible variant shows a dismiss button + fires onDismiss", async () => {
    const onDismiss = vi.fn();
    render(<Banner tone="info" title="x" dismissible onDismiss={onDismiss} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("non-dismissible variant has no dismiss button", () => {
    render(<Banner tone="info" title="x" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("renders an action button + fires onClick", async () => {
    const onClick = vi.fn();
    render(<Banner tone="info" title="x" action={{ label: "Reconnect", onClick }} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
