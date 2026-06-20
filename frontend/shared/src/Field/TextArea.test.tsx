import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, TextArea } from "./index.js";

describe("TextArea", () => {
  it("renders a textarea", () => {
    render(<TextArea aria-label="Notes" />);
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeInTheDocument();
  });

  it("default rows is 3", () => {
    render(<TextArea aria-label="Notes" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("rows", "3");
  });

  it("respects rows prop", () => {
    render(<TextArea aria-label="Notes" rows={8} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("rows", "8");
  });

  it("picks up Field's a11y wiring via useField()", () => {
    render(
      <Field label="Reflection" hint="Be candid." error="Required">
        <TextArea />
      </Field>,
    );
    const ta = screen.getByRole("textbox");
    expect(ta).toHaveAttribute("aria-invalid", "true");
    expect(ta).toHaveAttribute("aria-describedby");
  });

  it("border flips to danger when Field has an error", () => {
    render(
      <Field label="X" error="bad">
        <TextArea />
      </Field>,
    );
    expect(screen.getByRole("textbox").style.borderColor).toBe("var(--danger)");
  });

  it("autoGrow disables manual resize", () => {
    render(<TextArea aria-label="N" autoGrow />);
    expect(screen.getByRole("textbox").style.resize).toBe("none");
  });
});
