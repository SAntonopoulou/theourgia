import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery.js";

type Listener = (event: MediaQueryListEvent) => void;

class FakeMQL {
  matches: boolean;
  media: string;
  listeners = new Set<Listener>();
  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }
  addEventListener(_type: "change", l: Listener): void {
    this.listeners.add(l);
  }
  removeEventListener(_type: "change", l: Listener): void {
    this.listeners.delete(l);
  }
  dispatch(matches: boolean): void {
    this.matches = matches;
    for (const l of this.listeners) {
      l({ matches } as MediaQueryListEvent);
    }
  }
}

describe("useMediaQuery", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mql: FakeMQL;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mql = new FakeMQL("(min-width: 768px)", true);
    // @ts-expect-error happy-dom doesn't implement matchMedia by default
    window.matchMedia = vi.fn(() => mql);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns the initial match state", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the query result changes", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
    act(() => {
      mql.dispatch(false);
    });
    expect(result.current).toBe(false);
  });
});
