/**
 * SessionsAndDevices — H10 Cluster B6 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SessionsAndDevicesSurface } from "./SessionsAndDevicesSurface.js";

const CURRENT = {
  device: "This laptop · Firefox · Athens",
};

const OTHERS = [
  {
    id: "s1",
    device: "Your phone · Theourgia app · Berlin",
    geo: "Berlin, DE",
    lastSeen: "yesterday",
    kind: "phone" as const,
  },
  {
    id: "s2",
    device: "Your tablet · Safari · Athens",
    geo: "Athens, GR",
    lastSeen: "3 days ago",
    kind: "tablet" as const,
  },
];

describe("SessionsAndDevicesSurface", () => {
  test("renders current device with 'this session' chip + 'Active now'", () => {
    render(<SessionsAndDevicesSurface current={CURRENT} others={OTHERS} />);
    expect(screen.getByText(CURRENT.device)).toBeInTheDocument();
    expect(screen.getByText("this session")).toBeInTheDocument();
    expect(screen.getByText("Active now")).toBeInTheDocument();
  });

  test("renders other sessions with device + geo + last seen", () => {
    render(<SessionsAndDevicesSurface current={CURRENT} others={OTHERS} />);
    expect(
      screen.getByText("Your phone · Theourgia app · Berlin"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Berlin, DE · last seen yesterday/i),
    ).toBeInTheDocument();
  });

  test("rule 48 — NO token ID rendered anywhere", () => {
    const { container } = render(
      <SessionsAndDevicesSurface current={CURRENT} others={OTHERS} />,
    );
    // Session IDs should appear only as data attributes, never visible.
    expect(container.textContent).not.toContain("s1");
    expect(container.textContent).not.toContain("s2");
  });

  test("Sign out fires per-session callback with session id", () => {
    const onSignOut = vi.fn();
    render(
      <SessionsAndDevicesSurface
        current={CURRENT}
        others={OTHERS}
        onSignOut={onSignOut}
      />,
    );
    const signOutButtons = screen.getAllByText("Sign out");
    fireEvent.click(signOutButtons[0]!);
    expect(onSignOut).toHaveBeenCalledWith("s1");
  });

  test("Sign out everywhere else fires callback", () => {
    const onSignOutEverywhereElse = vi.fn();
    render(
      <SessionsAndDevicesSurface
        current={CURRENT}
        others={OTHERS}
        onSignOutEverywhereElse={onSignOutEverywhereElse}
      />,
    );
    fireEvent.click(screen.getByText("Sign out everywhere else"));
    expect(onSignOutEverywhereElse).toHaveBeenCalledTimes(1);
  });

  test("hides 'Sign out everywhere else' when only current session active", () => {
    render(<SessionsAndDevicesSurface current={CURRENT} others={[]} />);
    expect(screen.queryByText("Sign out everywhere else")).toBeNull();
  });

  test("shows calm empty-state line when no other sessions", () => {
    render(<SessionsAndDevicesSurface current={CURRENT} others={[]} />);
    expect(
      screen.getByText(/This is your only active session/i),
    ).toBeInTheDocument();
  });

  test("rule 2 — Sign out everywhere else uses --warn-soft, NOT --danger", () => {
    render(<SessionsAndDevicesSurface current={CURRENT} others={OTHERS} />);
    const btn = screen.getByText("Sign out everywhere else");
    const styles = btn.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(styles).not.toContain("--danger");
  });
});
