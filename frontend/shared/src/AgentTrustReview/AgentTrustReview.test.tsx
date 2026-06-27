/**
 * AgentTrustReview — H10 Cluster C12 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentTrustReviewSurface } from "./AgentTrustReviewSurface.js";
import type { CurrentCapabilityRow } from "./copy.js";

const CAPS: CurrentCapabilityRow[] = [
  { id: "a", label: "Read your divination sessions", wireKey: "read.entries" },
  { id: "b", label: "Read your magical beings", wireKey: "read.entities" },
  { id: "c", label: "Write to its own memory", wireKey: "filesystem" },
  {
    id: "d",
    label: "Spend from your API key",
    wireKey: "network.outbound",
    isNew: true,
  },
];

describe("AgentTrustReviewSurface", () => {
  test("renders the diff banner when addedSinceInstall is non-empty", () => {
    render(
      <AgentTrustReviewSurface
        capabilities={CAPS}
        addedSinceInstall={[
          { label: "Spend from your API key", wireKey: "network.outbound" },
        ]}
      />,
    );
    expect(
      screen.getByText(/Capabilities changed since you installed it/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An update added Spend from your API key/i),
    ).toBeInTheDocument();
  });

  test("hides the diff banner when addedSinceInstall is empty", () => {
    render(<AgentTrustReviewSurface capabilities={CAPS} />);
    expect(
      screen.queryByText(/Capabilities changed since you installed it/i),
    ).toBeNull();
  });

  test("new capabilities render in --warn-soft chrome with 'new' tag", () => {
    const { container } = render(
      <AgentTrustReviewSurface capabilities={CAPS} />,
    );
    const newRow = container.querySelector('[data-cap-new="true"]');
    expect(newRow).toBeTruthy();
    const styles = newRow?.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  test("toggling a capability switch fires onToggleCapability with new state", () => {
    const onToggle = vi.fn();
    render(
      <AgentTrustReviewSurface
        capabilities={CAPS}
        onToggleCapability={onToggle}
      />,
    );
    const firstSwitch = screen.getByRole("switch", {
      name: /Read your divination sessions/i,
    });
    fireEvent.click(firstSwitch);
    expect(onToggle).toHaveBeenCalledWith("a", false);
  });

  test("Renew fires onRenew callback", () => {
    const onRenew = vi.fn();
    render(
      <AgentTrustReviewSurface
        capabilities={CAPS}
        onRenew={onRenew}
      />,
    );
    fireEvent.click(screen.getByText("Renew approval"));
    expect(onRenew).toHaveBeenCalledTimes(1);
  });

  test("rule 59 — uninstall preserves memory by default (alsoDeleteMemory=false)", () => {
    const onUninstall = vi.fn();
    render(
      <AgentTrustReviewSurface
        capabilities={CAPS}
        onUninstall={onUninstall}
      />,
    );
    fireEvent.click(screen.getByText("Uninstall agent"));
    expect(onUninstall).toHaveBeenCalledWith({ alsoDeleteMemory: false });
  });

  test("ticking the delete-memory checkbox flips the payload", () => {
    const onUninstall = vi.fn();
    render(
      <AgentTrustReviewSurface
        capabilities={CAPS}
        onUninstall={onUninstall}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Also delete this agent's memory/i,
      }),
    );
    fireEvent.click(screen.getByText("Uninstall agent"));
    expect(onUninstall).toHaveBeenCalledWith({ alsoDeleteMemory: true });
  });

  test("rule 59 — checkbox hint copy renders verbatim", () => {
    render(<AgentTrustReviewSurface capabilities={CAPS} />);
    expect(
      screen.getByText(
        /By default, memory is preserved so you can reinstall and resume/i,
      ),
    ).toBeInTheDocument();
  });

  test("rule 2 — Uninstall button uses --warn-soft, NOT --danger", () => {
    const { container } = render(
      <AgentTrustReviewSurface capabilities={CAPS} />,
    );
    const btn = screen.getByText("Uninstall agent");
    const styles = btn.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(container.innerHTML).not.toContain("--danger");
  });
});
