import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Card } from "./index.js";

describe("Card", () => {
  it("renders an <article> by default", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello").tagName).toBe("ARTICLE");
  });

  it("respects the ``as`` prop", () => {
    render(<Card as="section">Hello</Card>);
    expect(screen.getByText("Hello").tagName).toBe("SECTION");
  });

  it("non-interactive cards have no role / tabIndex", () => {
    const { container } = render(<Card>Hi</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("tabIndex");
  });

  it("interactive cards become focusable buttons", () => {
    render(
      <Card interactive onClick={vi.fn()}>
        Hi
      </Card>,
    );
    const card = screen.getByRole("button", { name: "Hi" });
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("interactive: clicking fires onClick", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        Click me
      </Card>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("interactive: Enter and Space activate", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        Click me
      </Card>,
    );
    const user = userEvent.setup();
    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("uses token-driven background + radius + shadow", () => {
    const { container } = render(<Card>Hi</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle({
      background: "var(--bg-2)",
      borderRadius: "var(--r-lg, 12px)",
    });
  });
});
