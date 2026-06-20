import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field, NumberInput } from "./index.js";

describe("NumberInput", () => {
  it("renders a numeric input", () => {
    render(<NumberInput aria-label="Quantity" />);
    const input = screen.getByLabelText("Quantity");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("inputMode", "numeric");
  });

  it("passes min / max / step through to the native element", () => {
    render(<NumberInput aria-label="Q" min={0} max={10} step={0.5} />);
    const input = screen.getByLabelText("Q");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "10");
    expect(input).toHaveAttribute("step", "0.5");
  });

  it("typing fires onChange", async () => {
    const onChange = vi.fn();
    render(<NumberInput aria-label="Q" onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Q"), "42");
    expect(onChange).toHaveBeenCalled();
  });

  it("picks up Field a11y wiring", () => {
    render(
      <Field label="Quantity" required>
        <NumberInput />
      </Field>,
    );
    expect(screen.getByLabelText(/Quantity/)).toHaveAttribute("aria-required", "true");
  });

  it("border flips to danger when Field has error", () => {
    render(
      <Field label="X" error="invalid">
        <NumberInput />
      </Field>,
    );
    expect(screen.getByLabelText(/X/).style.borderColor).toBe("var(--danger)");
  });
});
