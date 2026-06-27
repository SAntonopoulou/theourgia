/**
 * AgentByoKeySettings — H10 Cluster C5 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentByoKeySettingsSurface } from "./AgentByoKeySettingsSurface.js";
import { RULE_57_PREAMBLE, SECRET_MASK } from "./copy.js";

const PER_AGENT = [
  { id: "ag-div", name: "Divination companion", kind: "shared" as const },
  { id: "ag-sync", name: "Synchronicity weaver", kind: "shared" as const },
  { id: "ag-study", name: "Study tutor", kind: "own" as const },
];

describe("AgentByoKeySettingsSurface", () => {
  test("rule 57 — preamble renders VERBATIM at the top", () => {
    render(
      <AgentByoKeySettingsSurface hasKey perAgent={PER_AGENT} />,
    );
    expect(screen.getByText(RULE_57_PREAMBLE)).toBeInTheDocument();
  });

  test("rule 57 — NO 'use Theourgia's key' affordance anywhere", () => {
    const { container } = render(
      <AgentByoKeySettingsSurface hasKey perAgent={PER_AGENT} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("theourgia's key");
    expect(html).not.toContain("service key");
    expect(html).not.toContain("provided key");
  });

  test("secret-field never displays the real key — only the mask + Reset", () => {
    render(
      <AgentByoKeySettingsSurface hasKey perAgent={PER_AGENT} />,
    );
    const input = screen.getByLabelText(
      "Stored Anthropic key (masked)",
    ) as HTMLInputElement;
    expect(input.value).toBe(SECRET_MASK);
    expect(input).toHaveAttribute("readonly");
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  test("Reset fires onReset callback", () => {
    const onReset = vi.fn();
    render(
      <AgentByoKeySettingsSurface
        hasKey
        perAgent={PER_AGENT}
        onReset={onReset}
      />,
    );
    fireEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test("hasKey=false renders paste input + Save (disabled until non-empty)", () => {
    const onSaveKey = vi.fn();
    render(
      <AgentByoKeySettingsSurface
        hasKey={false}
        perAgent={PER_AGENT}
        onSaveKey={onSaveKey}
      />,
    );
    const input = screen.getByLabelText(
      "Paste your Anthropic API key",
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    const save = screen.getByText("Save");
    expect(save).toBeDisabled();

    fireEvent.change(input, { target: { value: "sk-ant-test-key" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSaveKey).toHaveBeenCalledWith("sk-ant-test-key");
  });

  test("Subscription connect CTA fires callback", () => {
    const onConnect = vi.fn();
    render(
      <AgentByoKeySettingsSurface
        hasKey
        perAgent={PER_AGENT}
        onConnectSubscription={onConnect}
      />,
    );
    fireEvent.click(
      screen.getByText("Connect your Claude subscription"),
    );
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  test("Per-agent rows render with shared/own key label + Override button", () => {
    render(
      <AgentByoKeySettingsSurface hasKey perAgent={PER_AGENT} />,
    );
    expect(screen.getByText("Divination companion")).toBeInTheDocument();
    expect(screen.getAllByText("shared key").length).toBe(2);
    expect(screen.getByText("own key")).toBeInTheDocument();
    expect(screen.getAllByText("Override").length).toBe(3);
  });

  test("Override button fires callback with agent id", () => {
    const onOverrideAgent = vi.fn();
    render(
      <AgentByoKeySettingsSurface
        hasKey
        perAgent={PER_AGENT}
        onOverrideAgent={onOverrideAgent}
      />,
    );
    const overrideButtons = screen.getAllByText("Override");
    fireEvent.click(overrideButtons[2]!);
    expect(onOverrideAgent).toHaveBeenCalledWith("ag-study");
  });

  test("hint copy about rotation is verbatim", () => {
    render(
      <AgentByoKeySettingsSurface hasKey perAgent={PER_AGENT} />,
    );
    expect(
      screen.getByText(
        /The existing value is never displayed\. To rotate, paste a new key/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the old one is replaced and stops being used immediately/i),
    ).toBeInTheDocument();
  });

  test("empty per-agent list renders calm placeholder", () => {
    render(<AgentByoKeySettingsSurface hasKey perAgent={[]} />);
    expect(
      screen.getByText("No agents installed yet."),
    ).toBeInTheDocument();
  });
});
