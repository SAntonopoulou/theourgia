import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyThemeState,
  CONTRASTS,
  CVDS,
  DEFAULT_THEME_STATE,
  MODES,
  readThemeState,
  setThemeState,
  THEMES,
} from "./theme.js";

describe("theme tokens", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-contrast");
    document.documentElement.removeAttribute("data-cvd");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("readThemeState returns defaults when storage is empty", () => {
    expect(readThemeState()).toEqual(DEFAULT_THEME_STATE);
  });

  it("readThemeState honors valid stored values", () => {
    localStorage.setItem("theourgia.theme", "hellenic");
    localStorage.setItem("theourgia.mode", "light");
    expect(readThemeState()).toEqual({
      theme: "hellenic",
      mode: "light",
      contrast: "normal",
      cvd: "normal",
    });
  });

  it("readThemeState rejects invalid stored values", () => {
    localStorage.setItem("theourgia.theme", "rogue-theme");
    localStorage.setItem("theourgia.mode", "dawn");
    expect(readThemeState()).toEqual(DEFAULT_THEME_STATE);
  });

  it("applyThemeState writes attributes to <html> and mirrors to localStorage", () => {
    applyThemeState({
      theme: "thelemic",
      mode: "light",
      contrast: "high",
      cvd: "safe",
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("thelemic");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(document.documentElement.getAttribute("data-contrast")).toBe("high");
    expect(document.documentElement.getAttribute("data-cvd")).toBe("safe");
    expect(localStorage.getItem("theourgia.theme")).toBe("thelemic");
    expect(localStorage.getItem("theourgia.mode")).toBe("light");
  });

  it("setThemeState merges a patch atop the current state", () => {
    applyThemeState({
      theme: "hellenic",
      mode: "dark",
      contrast: "normal",
      cvd: "normal",
    });
    const result = setThemeState({ mode: "light" });
    expect(result).toEqual({
      theme: "hellenic",
      mode: "light",
      contrast: "normal",
      cvd: "normal",
    });
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("hellenic");
  });

  it("exports include the three shipped themes", () => {
    expect(THEMES).toEqual(["base", "hellenic", "thelemic"]);
  });

  it("exports include the two shipped modes + a11y axes", () => {
    expect(MODES).toEqual(["dark", "light"]);
    expect(CONTRASTS).toEqual(["normal", "high"]);
    expect(CVDS).toEqual(["normal", "safe"]);
  });
});
