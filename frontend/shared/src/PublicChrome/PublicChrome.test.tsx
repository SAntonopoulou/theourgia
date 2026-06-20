import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PublicChrome } from "./index.js";

describe("PublicChrome", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the default brand wordmark", () => {
    render(<PublicChrome />);
    expect(screen.getByText("Theourgia")).toBeInTheDocument();
  });

  it("renders a custom brand when supplied", () => {
    render(<PublicChrome brand={<span>Custom</span>} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByText("Theourgia")).toBeNull();
  });

  it("cycles theme on click (base → hellenic → thelemic → base)", async () => {
    render(<PublicChrome />);
    const user = userEvent.setup();
    const themeButton = screen.getByRole("button", { name: "Cycle theme" });
    expect(themeButton).toHaveTextContent("Base");
    await user.click(themeButton);
    expect(themeButton).toHaveTextContent("Hellenic");
    expect(document.documentElement.getAttribute("data-theme")).toBe("hellenic");
    await user.click(themeButton);
    expect(themeButton).toHaveTextContent("Thelemic");
    await user.click(themeButton);
    expect(themeButton).toHaveTextContent("Base");
  });

  it("cycles mode on click (dark → light → dark)", async () => {
    render(<PublicChrome />);
    const user = userEvent.setup();
    const modeButton = screen.getByRole("button", { name: "Cycle mode" });
    expect(modeButton).toHaveTextContent("Dark");
    await user.click(modeButton);
    expect(modeButton).toHaveTextContent("Light");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("hides toggles when hideToggles=true", () => {
    render(<PublicChrome hideToggles />);
    expect(screen.queryByRole("button", { name: "Cycle theme" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cycle mode" })).toBeNull();
  });

  it("renders the actions slot", () => {
    render(<PublicChrome actions={<button type="button">Sign in</button>} />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
