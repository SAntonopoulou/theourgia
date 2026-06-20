import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field, Select } from "./index.js";

const OPTIONS = [
  { value: "hellenic", label: "Hellenic" },
  { value: "thelemic", label: "Thelemic" },
  { value: "base", label: "Base" },
];

describe("Select", () => {
  it("renders all options", () => {
    render(<Select options={OPTIONS} aria-label="Tradition" defaultValue="base" />);
    expect(screen.getByRole("option", { name: "Hellenic" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Thelemic" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Base" })).toBeInTheDocument();
  });

  it("renders placeholder when supplied", () => {
    render(
      <Select options={OPTIONS} aria-label="Tradition" placeholder="Choose…" defaultValue="" />,
    );
    const placeholder = screen.getByRole("option", { name: "Choose…" });
    expect(placeholder).toBeDisabled();
  });

  it("change fires onChange with the new value", async () => {
    const onChange = vi.fn();
    render(
      <Select options={OPTIONS} aria-label="Tradition" defaultValue="base" onChange={onChange} />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox"), "thelemic");
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("thelemic");
  });

  it("picks up Field a11y wiring", () => {
    render(
      <Field label="Tradition" required>
        <Select options={OPTIONS} defaultValue="base" />
      </Field>,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-required", "true");
  });

  it("disabled option is not selectable", () => {
    const withDisabled = [...OPTIONS, { value: "future", label: "Future", disabled: true }];
    render(<Select options={withDisabled} aria-label="X" defaultValue="base" />);
    expect(screen.getByRole("option", { name: "Future" })).toBeDisabled();
  });
});
