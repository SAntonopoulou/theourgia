import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../Button/index.js";
import { EmptyState } from "./index.js";

describe("EmptyState", () => {
  it("renders the title as a heading", () => {
    render(<EmptyState title="Nothing written yet" />);
    expect(screen.getByRole("heading", { name: "Nothing written yet" })).toBeInTheDocument();
  });

  it("uses role=status so screen readers announce the empty result", () => {
    render(<EmptyState title="X" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders body prose when supplied", () => {
    render(<EmptyState title="Nothing written yet" body="Your first entry begins the record." />);
    expect(screen.getByText("Your first entry begins the record.")).toBeInTheDocument();
  });

  it("renders an action element when supplied", () => {
    render(<EmptyState title="X" action={<Button>Open editor</Button>} />);
    expect(screen.getByRole("button", { name: "Open editor" })).toBeInTheDocument();
  });

  it("renders a contemplative glyph when one is named", () => {
    const { container } = render(<EmptyState title="X" glyph="feather" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#theo-feather");
  });
});
