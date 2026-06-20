import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "./index.js";

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render the tooltip initially", () => {
    render(
      <Tooltip label="Notifications">
        <button type="button">Bell</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens after the delay on hover", () => {
    render(
      <Tooltip label="Notifications" delay={200}>
        <button type="button">Bell</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Bell" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("opens immediately on focus (keyboard users)", () => {
    render(
      <Tooltip label="N" delay={500}>
        <button type="button">B</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on mouseleave", () => {
    render(
      <Tooltip label="N" delay={0}>
        <button type="button">B</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on blur", () => {
    render(
      <Tooltip label="N">
        <button type="button">B</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button");
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("ESC closes the tooltip", () => {
    render(
      <Tooltip label="N">
        <button type="button">B</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("delay=0 opens immediately on hover", () => {
    render(
      <Tooltip label="N" delay={0}>
        <button type="button">B</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("aria-describedby links the trigger to the tooltip", () => {
    render(
      <Tooltip label="N">
        <button type="button">B</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    const tooltipId = screen.getByRole("tooltip").id;
    expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", tooltipId);
  });
});
