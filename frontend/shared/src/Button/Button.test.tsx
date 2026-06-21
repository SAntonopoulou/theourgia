import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, IconButton } from "./index.js";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("defaults to variant=primary, size=md, type=button", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.style.backgroundColor).toBe("var(--accent)");
    expect(button.style.minHeight).toBe("38px");
  });

  it.each([
    ["primary", "var(--accent)"],
    ["secondary", "transparent"],
    ["danger", "var(--danger)"],
  ])("variant=%s sets the expected backgroundColor", (variant, expected) => {
    render(<Button variant={variant as "primary" | "secondary" | "danger"}>X</Button>);
    expect(screen.getByRole("button").style.backgroundColor).toBe(expected);
  });

  it("ghost, quiet, and secondary all have transparent backgrounds", () => {
    const { rerender } = render(<Button variant="ghost">G</Button>);
    expect(screen.getByRole("button").style.backgroundColor).toBe("transparent");
    rerender(<Button variant="quiet">Q</Button>);
    expect(screen.getByRole("button").style.backgroundColor).toBe("transparent");
    rerender(<Button variant="secondary">S</Button>);
    expect(screen.getByRole("button").style.backgroundColor).toBe("transparent");
  });

  it.each([
    ["sm", "30px"],
    ["md", "38px"],
    ["lg", "46px"],
  ])("size=%s yields the documented min-height", (size, height) => {
    render(<Button size={size as "sm" | "md" | "lg"}>X</Button>);
    expect(screen.getByRole("button").style.minHeight).toBe(height);
  });

  it("renders an iconStart glyph before the label", () => {
    const { container } = render(<Button iconStart="journal">Open</Button>);
    const button = screen.getByRole("button");
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#theo-journal");
    expect(button.firstChild).toBe(container.querySelector("svg"));
  });

  it("renders an iconEnd glyph after the label", () => {
    const { container } = render(<Button iconEnd="star">Next</Button>);
    const button = screen.getByRole("button");
    const svg = container.querySelector("svg");
    expect(button.lastChild).toBe(svg);
  });

  it("disabled prevents click", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        X
      </Button>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading: disables the button + sets aria-busy + dims the label", () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.style.opacity).toBe("0.7");
  });

  it("invokes onClick when clicked (enabled, not loading)", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("submits on Enter when inside a form (default type=button overridable)", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Submit</Button>
      </form>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("IconButton", () => {
  it("requires + exposes an accessible label", () => {
    render(<IconButton glyph="bell" label="Notifications" />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("renders the named glyph", () => {
    const { container } = render(<IconButton glyph="moon" label="Lunar" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#theo-moon");
  });

  it.each([
    ["sm", "30px"],
    ["md", "38px"],
    ["lg", "46px"],
  ])("size=%s sets the square dimensions to %s", (size, px) => {
    render(<IconButton glyph="key" label="Keys" size={size as "sm" | "md" | "lg"} />);
    const button = screen.getByRole("button");
    expect(button.style.width).toBe(px);
    expect(button.style.height).toBe(px);
  });

  it("loading disables it and marks aria-busy", () => {
    render(<IconButton glyph="bell" label="Notifications" loading />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
