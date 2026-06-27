/**
 * AgentCapabilityReview — H10 Cluster C4 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  AgentCapabilityReviewSurface,
  type AgentCapabilityReviewSurfaceProps,
} from "./AgentCapabilityReviewSurface.js";
import {
  type AgentCapabilityRow,
  RULE_52_LINE,
  RULE_53_LINE,
} from "./copy.js";

const ALREADY_GRANTED: AgentCapabilityRow[] = [
  {
    label: "Read your divination sessions",
    wireKey: "read.entries",
    note: "Reads past readings. Cannot modify or delete them.",
  },
  {
    label: "Read your magical beings",
    wireKey: "read.entities",
    note: "Recognises recurring figures across readings.",
  },
];

const NEWLY_REQUESTED: AgentCapabilityRow[] = [
  {
    label: "Spend from your API key",
    wireKey: "network.outbound",
    note: "The new version calls the model directly with your key.",
  },
];

const BASE: AgentCapabilityReviewSurfaceProps = {
  agentName: "Divination companion",
  agentDid: "did:theourgia:terra.example:oracle-tools",
  agentVersion: "2.1.0",
  alreadyGranted: ALREADY_GRANTED,
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

describe("AgentCapabilityReviewSurface", () => {
  test("dialog has accessible title + identity row", () => {
    render(<AgentCapabilityReviewSurface {...BASE} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "cr-title");
    expect(screen.getByText("Capability review")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Divination companion · did:theourgia:terra\.example:oracle-tools · v2\.1\.0/i,
      ),
    ).toBeInTheDocument();
  });

  test("install scenario renders all capabilities under 'Already granted' style (no warn-soft on rows)", () => {
    const { container } = render(<AgentCapabilityReviewSurface {...BASE} />);
    expect(screen.queryByText("New in this update")).toBeNull();
    const granted = container.querySelectorAll('[data-cap-kind="granted"]');
    expect(granted.length).toBe(ALREADY_GRANTED.length);
    const newCaps = container.querySelectorAll('[data-cap-kind="new"]');
    expect(newCaps.length).toBe(0);
  });

  test("update scenario renders newly-requested ABOVE already-granted with --warn-soft chrome", () => {
    const { container } = render(
      <AgentCapabilityReviewSurface
        {...BASE}
        scenario="update"
        newlyRequested={NEWLY_REQUESTED}
      />,
    );
    expect(screen.getByText("New in this update")).toBeInTheDocument();
    expect(screen.getByText("Already granted")).toBeInTheDocument();

    const newSection = container.querySelector(
      '[data-section="new-in-update"]',
    );
    const grantedSection = container.querySelector(
      '[data-section="already-granted"]',
    );
    expect(newSection).toBeTruthy();
    expect(grantedSection).toBeTruthy();
    const all = Array.from(container.querySelectorAll("*"));
    expect(all.indexOf(newSection!)).toBeLessThan(
      all.indexOf(grantedSection!),
    );

    const newCap = container.querySelector('[data-cap-kind="new"]');
    const styles = newCap?.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
  });

  test("rule 52 + 53 — 'Never visible' block renders both exclusion lines verbatim", () => {
    render(<AgentCapabilityReviewSurface {...BASE} />);
    expect(screen.getByText(RULE_52_LINE)).toBeInTheDocument();
    expect(screen.getByText(RULE_53_LINE)).toBeInTheDocument();
  });

  test("rule 31 — Approve is DISABLED until the modal body is scrolled to bottom", () => {
    render(<AgentCapabilityReviewSurface {...BASE} />);
    expect(screen.getByText(/Approve/i)).toBeDisabled();
    expect(
      screen.getByText(/Scroll to review every capability/i),
    ).toBeInTheDocument();
  });

  test("scroll hint flips from pending to done once gated open", () => {
    const { container } = render(
      <AgentCapabilityReviewSurface {...BASE} />,
    );
    const scrollRegion = container.querySelector(
      '[data-scroll-gate]',
    ) as HTMLElement;
    expect(scrollRegion).toBeTruthy();
    scrollToBottom(scrollRegion);
    expect(
      screen.getByText(/You have reviewed every capability/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Reviewed$/i)).toBeInTheDocument();
    expect(screen.getByText(/Approve/i)).toBeEnabled();
  });

  test("update scenario flips button label to 'Approve update'", () => {
    render(
      <AgentCapabilityReviewSurface
        {...BASE}
        scenario="update"
        newlyRequested={NEWLY_REQUESTED}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Approve update/i }),
    ).toBeInTheDocument();
  });

  test("Approve fires onApprove + Cancel fires onCancel", () => {
    const onApprove = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <AgentCapabilityReviewSurface
        {...BASE}
        onApprove={onApprove}
        onCancel={onCancel}
      />,
    );
    const scrollRegion = container.querySelector(
      '[data-scroll-gate]',
    ) as HTMLElement;
    scrollToBottom(scrollRegion);
    fireEvent.click(screen.getByText(/Approve/i));
    expect(onApprove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("rule 31 — there is NO 'Grant all' shortcut button anywhere", () => {
    const { container } = render(
      <AgentCapabilityReviewSurface
        {...BASE}
        scenario="update"
        newlyRequested={NEWLY_REQUESTED}
      />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("grant all");
    expect(html).not.toContain("approve all");
  });
});
