import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toast, ToastProvider, _resetToasts } from "./index.js";

describe("Toast", () => {
  beforeEach(() => {
    _resetToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    _resetToasts();
    vi.useRealTimers();
  });

  it("Toast.push displays a toast through ToastProvider", () => {
    render(<ToastProvider />);
    act(() => {
      Toast.push({ tone: "success", title: "Saved" });
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("auto-dismisses after the duration", () => {
    render(<ToastProvider />);
    act(() => {
      Toast.push({ tone: "info", title: "Note", duration: 1000 });
    });
    expect(screen.getByText("Note")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText("Note")).toBeNull();
  });

  it("Infinity duration keeps the toast sticky", () => {
    render(<ToastProvider />);
    act(() => {
      Toast.push({ tone: "warning", title: "Sticky", duration: Number.POSITIVE_INFINITY });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Sticky")).toBeInTheDocument();
  });

  it("× button dismisses immediately", () => {
    render(<ToastProvider />);
    act(() => {
      Toast.push({ tone: "info", title: "X", duration: Number.POSITIVE_INFINITY });
    });
    expect(screen.getByText("X")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    });
    expect(screen.queryByText("X")).toBeNull();
  });

  it("action button calls callback + dismisses", () => {
    const onClick = vi.fn();
    render(<ToastProvider />);
    act(() => {
      Toast.push({
        tone: "info",
        title: "Saved",
        duration: Number.POSITIVE_INFINITY,
        action: { label: "Undo", onClick },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("max cap drops older toasts when exceeded", () => {
    render(<ToastProvider max={2} />);
    act(() => {
      Toast.push({ tone: "info", title: "A", duration: Number.POSITIVE_INFINITY });
      Toast.push({ tone: "info", title: "B", duration: Number.POSITIVE_INFINITY });
      Toast.push({ tone: "info", title: "C", duration: Number.POSITIVE_INFINITY });
    });
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("error tone renders role=alert (assertive live region per toast)", () => {
    render(<ToastProvider />);
    act(() => {
      Toast.push({ tone: "error", title: "Broken", duration: Number.POSITIVE_INFINITY });
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
