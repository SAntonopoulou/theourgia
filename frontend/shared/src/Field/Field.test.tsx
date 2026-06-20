import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field, TextInput } from "./index.js";

describe("Field", () => {
  it("renders the label and associates it with the input", () => {
    render(
      <Field label="Email">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders hint text and links it via aria-describedby", () => {
    render(
      <Field label="Email" hint="We never share it.">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy as string);
    expect(hint).toHaveTextContent("We never share it.");
  });

  it("marks the input invalid when error is present", () => {
    render(
      <Field label="Email" error="Required.">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required.");
  });

  it("shows error in place of hint when both are present", () => {
    render(
      <Field label="Email" hint="We never share it." error="Required.">
        <TextInput />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required.");
    expect(screen.queryByText("We never share it.")).not.toBeInTheDocument();
  });

  it("required marks the label visually and aria-required on the input", () => {
    render(
      <Field label="Email" required>
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("respects an explicit id when supplied", () => {
    render(
      <Field label="Email" id="my-email">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input.id).toBe("my-email");
  });

  it("forwards user input events through TextInput", async () => {
    const onChange = vi.fn();
    render(
      <Field label="Name">
        <TextInput onChange={onChange} />
      </Field>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Soror");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("TextInput (standalone)", () => {
  it("renders even without a Field wrapper", () => {
    render(<TextInput placeholder="standalone" />);
    expect(screen.getByPlaceholderText("standalone")).toBeInTheDocument();
  });

  it("does not impose Field wiring when standalone", () => {
    render(<TextInput placeholder="x" />);
    const input = screen.getByPlaceholderText("x");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-required");
  });
});
