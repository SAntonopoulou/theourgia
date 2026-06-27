/**
 * AccessibilityAndMotion — H10 Cluster B7 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AccessibilityAndMotionSurface } from "./AccessibilityAndMotionSurface.js";
import {
  type AccessibilityPrefs,
  DEFAULT_PREFS,
  formatScaleLabel,
} from "./copy.js";

describe("AccessibilityAndMotionSurface", () => {
  test("crisis nudge is OFF by default (rule from feedback memory)", () => {
    expect(DEFAULT_PREFS.crisisNudge).toBe(false);
  });

  test("renders all three toggles + slider + crisis nudge", () => {
    render(
      <AccessibilityAndMotionSurface
        value={DEFAULT_PREFS}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Reduced motion")).toBeInTheDocument();
    expect(screen.getByText("Increased contrast")).toBeInTheDocument();
    expect(screen.getByText("Autoplay audio")).toBeInTheDocument();
    expect(screen.getByText("Larger text")).toBeInTheDocument();
    expect(screen.getByText("Crisis-aware nudge")).toBeInTheDocument();
  });

  test("toggle fires onChange with the partial update", () => {
    const onChange = vi.fn();
    render(
      <AccessibilityAndMotionSurface
        value={DEFAULT_PREFS}
        onChange={onChange}
      />,
    );
    const sw = screen.getByRole("switch", { name: /Reduced motion/i });
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PREFS,
      reducedMotion: true,
    });
  });

  test("crisis-nudge copy renders verbatim (designer-locked wellbeing copy)", () => {
    render(
      <AccessibilityAndMotionSurface
        value={DEFAULT_PREFS}
        onChange={vi.fn()}
      />,
    );
    // Verbatim phrases from the designer; must NOT be paraphrased.
    expect(
      screen.getByText(/Sacred Well Directory/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never assumes a diagnosis/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Off by default/i),
    ).toBeInTheDocument();
  });

  test("rule — crisis nudge uses care palette (--peer-ok), NOT --danger", () => {
    const { container } = render(
      <AccessibilityAndMotionSurface
        value={DEFAULT_PREFS}
        onChange={vi.fn()}
      />,
    );
    const styles = container.innerHTML;
    expect(styles).toContain("--peer-ok-soft");
    expect(styles).not.toContain("--danger");
  });

  test("formatScaleLabel drops trailing zeros + adds × suffix", () => {
    expect(formatScaleLabel(1.0)).toBe("1×");
    expect(formatScaleLabel(1.5)).toBe("1.5×");
    expect(formatScaleLabel(0.875)).toBe("0.875×");
    expect(formatScaleLabel(1.125)).toBe("1.125×");
  });

  test("slider fires onChange with parsed numeric value", () => {
    const onChange = vi.fn();
    render(
      <AccessibilityAndMotionSurface
        value={DEFAULT_PREFS}
        onChange={onChange}
      />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "1.25" } });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PREFS,
      textScale: 1.25,
    });
  });

  test("controlled component — value prop drives the switch state", () => {
    const value: AccessibilityPrefs = {
      ...DEFAULT_PREFS,
      reducedMotion: true,
    };
    render(
      <AccessibilityAndMotionSurface value={value} onChange={vi.fn()} />,
    );
    const sw = screen.getByRole("switch", { name: /Reduced motion/i });
    expect(sw).toHaveAttribute("aria-checked", "true");
  });
});
