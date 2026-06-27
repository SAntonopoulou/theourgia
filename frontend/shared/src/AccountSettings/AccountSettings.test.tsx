/**
 * AccountSettings — H10 Cluster B1 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AccountSettingsSurface } from "./AccountSettingsSurface.js";

describe("AccountSettingsSurface", () => {
  test("renders all seven sections", () => {
    render(<AccountSettingsSurface />);
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Accessibility and motion")).toBeInTheDocument();
    expect(screen.getByText("Digital inheritance")).toBeInTheDocument();
    expect(screen.getByText("Account lifecycle")).toBeInTheDocument();
    expect(screen.getByText("About this Theourgia instance")).toBeInTheDocument();
  });

  test("only Identity is expanded by default", () => {
    render(<AccountSettingsSurface />);
    const identityHeader = screen
      .getByText("Identity")
      .closest("button");
    expect(identityHeader).toHaveAttribute("aria-expanded", "true");
    const securityHeader = screen
      .getByText("Security")
      .closest("button");
    expect(securityHeader).toHaveAttribute("aria-expanded", "false");
  });

  test("clicking a header toggles open state", () => {
    render(<AccountSettingsSurface />);
    const securityHeader = screen
      .getByText("Security")
      .closest("button")!;
    fireEvent.click(securityHeader);
    expect(securityHeader).toHaveAttribute("aria-expanded", "true");
  });

  test("Security section reveals the three sub-page links when expanded", () => {
    render(<AccountSettingsSurface />);
    fireEvent.click(screen.getByText("Security").closest("button")!);
    expect(
      screen.getByText("Signing keys & rotation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Active sessions & devices"),
    ).toBeInTheDocument();
    expect(screen.getByText("WebAuthn enrollment")).toBeInTheDocument();
  });

  test("Delete your account link renders in --warn (rule 2 — never --danger)", () => {
    render(<AccountSettingsSurface />);
    fireEvent.click(
      screen.getByText("Account lifecycle").closest("button")!,
    );
    // The "Account lifecycle" subtitle also contains "Delete your account";
    // find the actual link element specifically.
    const link = screen
      .getByRole("link", { name: /Delete your account/i });
    const styles = link.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn)");
    expect(styles).not.toContain("--danger");
  });

  test("Digital inheritance — toggle fires callback", () => {
    const onToggleInheritance = vi.fn();
    render(
      <AccountSettingsSurface
        onToggleInheritance={onToggleInheritance}
      />,
    );
    fireEvent.click(
      screen.getByText("Digital inheritance").closest("button")!,
    );
    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    expect(onToggleInheritance).toHaveBeenCalledWith(true);
  });

  test("Rule 47 — inheritance hint says 'calmly now, not at end of life'", () => {
    render(<AccountSettingsSurface />);
    fireEvent.click(
      screen.getByText("Digital inheritance").closest("button")!,
    );
    expect(
      screen.getByText(/calmly now, not at end of life/i),
    ).toBeInTheDocument();
  });

  test("setup-executor CTA only shows when inheritance is on", () => {
    const { rerender } = render(
      <AccountSettingsSurface inheritanceOn={false} />,
    );
    fireEvent.click(
      screen.getByText("Digital inheritance").closest("button")!,
    );
    expect(screen.queryByText(/Set up executor/i)).toBeNull();

    rerender(<AccountSettingsSurface inheritanceOn={true} />);
    expect(screen.getByText(/Set up executor/i)).toBeInTheDocument();
  });

  test("About section renders operator + version + source from props", () => {
    render(
      <AccountSettingsSurface
        about={{
          operator: "hearth.sophia.example",
          version: "Theourgia v1.0.0-rc",
          sourceLabel: "AGPL-3.0 repository",
          sourceHref: "https://github.com/SAntonopoulou/theourgia",
        }}
      />,
    );
    fireEvent.click(
      screen.getByText("About this Theourgia instance").closest("button")!,
    );
    expect(
      screen.getByText("hearth.sophia.example"),
    ).toBeInTheDocument();
    expect(screen.getByText("Theourgia v1.0.0-rc")).toBeInTheDocument();
    expect(
      screen.getByText(/AGPL-3.0 repository/i),
    ).toBeInTheDocument();
  });
});
