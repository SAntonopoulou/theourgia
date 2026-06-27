/**
 * KeyRotation — H10 Cluster B5 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { KeyRotationSurface } from "./KeyRotationSurface.js";

const CURRENT = {
  fingerprint: "SHA256:7a3f 9c21 04bb e8d5",
  createdOn: "14 March 2026",
  lastUsed: "2 hours ago",
};

const HISTORY = [
  {
    fingerprint: "SHA256:1c44 a90b 7e21 03df",
    retiredOn: "14 Mar 2026",
  },
  {
    fingerprint: "SHA256:e87a 22c0 5b1f 9d3e",
    retiredOn: "2 Nov 2025",
  },
];

describe("KeyRotationSurface", () => {
  test("renders the current key card with fingerprint + created + last used", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} />);
    expect(screen.getByText("SHA256:7a3f 9c21 04bb e8d5")).toBeInTheDocument();
    expect(screen.getByText("14 March 2026")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  test("renders all four rotation steps in order", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} />);
    expect(
      screen.getByText(/Generate the new key/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Re-sign your federation envelopes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Publish the new public key/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Retire the old key/)).toBeInTheDocument();
  });

  test("step 1 body emphasises private key never leaves the browser", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} />);
    expect(
      screen.getByText(/private half never reaches the server/i),
    ).toBeInTheDocument();
  });

  test("Begin rotation fires onBeginRotation callback", () => {
    const onBeginRotation = vi.fn();
    render(
      <KeyRotationSurface
        current={CURRENT}
        history={HISTORY}
        onBeginRotation={onBeginRotation}
      />,
    );
    fireEvent.click(screen.getByText("Begin rotation"));
    expect(onBeginRotation).toHaveBeenCalledTimes(1);
  });

  test("renders trusted key history rows with retired-on labels", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} />);
    expect(
      screen.getByText("SHA256:1c44 a90b 7e21 03df"),
    ).toBeInTheDocument();
    expect(screen.getByText(/retired 14 Mar 2026/)).toBeInTheDocument();
    expect(screen.getByText(/retired 2 Nov 2025/)).toBeInTheDocument();
  });

  test("shows calm empty-state when no history yet", () => {
    render(<KeyRotationSurface current={CURRENT} history={[]} />);
    expect(
      screen.getByText(/No retired keys yet/i),
    ).toBeInTheDocument();
  });

  test("emergency revocation body renders verbatim", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} />);
    expect(
      screen.getByText(/If you believe your key has been compromised/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Revocation propagates to your federation peers within 24 hours/i),
    ).toBeInTheDocument();
  });

  test("Revoke fires onRevoke callback", () => {
    const onRevoke = vi.fn();
    render(
      <KeyRotationSurface
        current={CURRENT}
        history={HISTORY}
        onRevoke={onRevoke}
      />,
    );
    fireEvent.click(screen.getByText("Revoke this key"));
    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  test("rule 2 — Revoke button is --warn-soft chrome, NOT --danger", () => {
    const { container } = render(
      <KeyRotationSurface current={CURRENT} history={HISTORY} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("--warn-soft");
    expect(html).not.toContain("--danger");
  });

  test("busy state disables both buttons", () => {
    render(<KeyRotationSurface current={CURRENT} history={HISTORY} busy />);
    expect(screen.getByText("Begin rotation")).toBeDisabled();
    expect(screen.getByText("Revoke this key")).toBeDisabled();
  });
});
