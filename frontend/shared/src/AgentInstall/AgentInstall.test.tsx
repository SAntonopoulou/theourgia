/**
 * AgentInstall — H10 Cluster C3 tests · the worked example.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  AgentInstallSurface,
  type AgentInstallSurfaceProps,
} from "./AgentInstallSurface.js";
import { RULE_52_LINE, RULE_53_LINE } from "./copy.js";

const BASE: AgentInstallSurfaceProps = {
  preamble:
    "This agent reads across your past divination sessions and draws your attention to what recurs — it surfaces patterns; it never tells you what they mean.",
  capabilities: [
    {
      label: "Read your divination sessions",
      wireKey: "read.entries",
      note: "Reads your past readings and their results. It cannot modify or delete them.",
    },
    {
      label: "Read your magical beings",
      wireKey: "read.entities",
      note: "Reads entities referenced in readings to recognise recurring figures.",
    },
  ],
  memoryDirPath: "/srv/theourgia/agents/aspasia/divination-companion/",
};

function scrollToBottom(el: HTMLElement) {
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    value: 1000,
  });
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: 500,
  });
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    value: 500,
  });
  fireEvent.scroll(el);
}

describe("AgentInstallSurface", () => {
  test("rule 53 — sealed-content exclusion line is verbatim", () => {
    render(<AgentInstallSurface {...BASE} />);
    expect(screen.getByText(RULE_53_LINE)).toBeInTheDocument();
  });

  test("rule 52 — closed-tradition exclusion line is verbatim", () => {
    render(<AgentInstallSurface {...BASE} />);
    expect(screen.getByText(RULE_52_LINE)).toBeInTheDocument();
  });

  test("exclusions render BEFORE the capability list (rule order)", () => {
    const { container } = render(<AgentInstallSurface {...BASE} />);
    const sealed = container.querySelector('[data-exclusion="sealed"]');
    const firstCap = container.querySelector('[data-cap]');
    expect(sealed).toBeTruthy();
    expect(firstCap).toBeTruthy();
    // Sealed exclusion appears earlier in the DOM than the first capability.
    const all = Array.from(container.querySelectorAll("*"));
    expect(all.indexOf(sealed!)).toBeLessThan(all.indexOf(firstCap!));
  });

  test("rule 56 — hard-cost-cap explanation renders verbatim", () => {
    render(<AgentInstallSurface {...BASE} />);
    expect(
      screen.getByText(/There is no silent override/i),
    ).toBeInTheDocument();
  });

  test("rule 59 — memory dir path renders VERBATIM in --font-mono", () => {
    render(<AgentInstallSurface {...BASE} />);
    expect(
      screen.getByText("/srv/theourgia/agents/aspasia/divination-companion/"),
    ).toBeInTheDocument();
  });

  test("rule 31 — Install is DISABLED until the user scrolls to the bottom", () => {
    render(<AgentInstallSurface {...BASE} />);
    const installBtn = screen.getByRole("button", {
      name: /Install/i,
    });
    expect(installBtn).toBeDisabled();
    expect(
      screen.getByText(/Scroll through the capabilities to continue/i),
    ).toBeInTheDocument();
  });

  test("Install enables once scrolled AND cost-cap is positive", () => {
    const { container } = render(
      <AgentInstallSurface {...BASE} hasKey />,
    );
    const scrollRegion = container.querySelector(
      '[data-scroll-gate]',
    ) as HTMLElement | null;
    expect(scrollRegion).toBeTruthy();
    scrollToBottom(scrollRegion!);
    expect(screen.getByText(/Reviewed/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Install agent/i }),
    ).toBeEnabled();
  });

  test("Cost cap of 0 keeps Install disabled even after scroll", () => {
    const { container } = render(
      <AgentInstallSurface
        {...BASE}
        hasKey
        initialCostCap="0"
      />,
    );
    const scrollRegion = container.querySelector(
      '[data-scroll-gate]',
    ) as HTMLElement;
    scrollToBottom(scrollRegion);
    expect(screen.getByText(/Set a monthly cost cap/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Install agent/i }),
    ).toBeDisabled();
  });

  test("rule 57 — no-key banner renders + label flips to 'Install (stays inactive)'", () => {
    render(<AgentInstallSurface {...BASE} hasKey={false} />);
    expect(
      screen.getByText(/An API key is required before this agent can run/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Install \(stays inactive\)/i }),
    ).toBeInTheDocument();
  });

  test("hasKey=true hides the no-key banner + uses 'Install agent' label", () => {
    render(<AgentInstallSurface {...BASE} hasKey />);
    expect(
      screen.queryByText(/An API key is required before this agent/i),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /^Install agent$/i }),
    ).toBeInTheDocument();
  });

  test("Install fires onInstall with cost-cap + installInactive flag", () => {
    const onInstall = vi.fn();
    const { container } = render(
      <AgentInstallSurface
        {...BASE}
        hasKey={false}
        initialCostCap="15.00"
        onInstall={onInstall}
      />,
    );
    const scrollRegion = container.querySelector(
      '[data-scroll-gate]',
    ) as HTMLElement;
    scrollToBottom(scrollRegion);
    fireEvent.click(
      screen.getByRole("button", { name: /Install \(stays inactive\)/i }),
    );
    expect(onInstall).toHaveBeenCalledWith({
      costCapMonthly: 15,
      installInactive: true,
    });
  });

  test("Cancel fires onCancel", () => {
    const onCancel = vi.fn();
    render(<AgentInstallSurface {...BASE} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("capabilities render with plain label + monospace wire key + note", () => {
    render(<AgentInstallSurface {...BASE} />);
    expect(
      screen.getByText("Read your divination sessions"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("read.entries").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/It cannot modify or delete them/i),
    ).toBeInTheDocument();
  });
});
