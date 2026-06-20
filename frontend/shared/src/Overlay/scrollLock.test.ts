import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _resetScrollLock, acquireScrollLock, releaseScrollLock } from "./scrollLock.js";

describe("scrollLock", () => {
  beforeEach(() => {
    _resetScrollLock();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    _resetScrollLock();
  });

  it("first acquire locks body overflow", () => {
    acquireScrollLock();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("release restores overflow once the count reaches 0", () => {
    document.body.style.overflow = "scroll";
    acquireScrollLock();
    expect(document.body.style.overflow).toBe("hidden");
    releaseScrollLock();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("stacked acquires only release when count returns to 0", () => {
    document.body.style.overflow = "";
    acquireScrollLock();
    acquireScrollLock();
    expect(document.body.style.overflow).toBe("hidden");
    releaseScrollLock();
    expect(document.body.style.overflow).toBe("hidden");
    releaseScrollLock();
    expect(document.body.style.overflow).toBe("");
  });

  it("release without acquire is a no-op", () => {
    document.body.style.overflow = "auto";
    releaseScrollLock();
    expect(document.body.style.overflow).toBe("auto");
  });
});
