import { describe, expect, it } from "vitest";

import { _, _lazy, _n, _n_lazy, gettext, ngettext } from "./index.js";

describe("frontend i18n shim", () => {
  it("gettext returns the source string when no translation pipeline is active", () => {
    expect(gettext("Welcome")).toBe("Welcome");
  });

  it("interpolates {name}-style placeholders", () => {
    expect(gettext("Hello, {name}!", { name: "Soror" })).toBe("Hello, Soror!");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(gettext("Hello, {name}!")).toBe("Hello, {name}!");
  });

  it("_ is the short alias for gettext", () => {
    expect(_).toBe(gettext);
  });

  it("ngettext returns singular when n=1", () => {
    expect(ngettext("{n} entry", "{n} entries", 1)).toBe("1 entry");
  });

  it("ngettext returns plural when n!=1", () => {
    expect(ngettext("{n} entry", "{n} entries", 5)).toBe("5 entries");
    expect(ngettext("{n} entry", "{n} entries", 0)).toBe("0 entries");
  });

  it("ngettext composes with extra substitutions", () => {
    expect(
      ngettext("{n} entry by {who}", "{n} entries by {who}", 3, {
        who: "Soror",
      }),
    ).toBe("3 entries by Soror");
  });

  it("_n is the short alias for ngettext", () => {
    expect(_n).toBe(ngettext);
  });

  it("_lazy resolves at toString time", () => {
    const lazy = _lazy("Hello");
    expect(typeof lazy.toString).toBe("function");
    expect(lazy.toString()).toBe("Hello");
    expect(String(lazy)).toBe("Hello");
  });

  it("_n_lazy resolves at toString time with the right form", () => {
    const lazy = _n_lazy("{n} item", "{n} items", 2);
    expect(lazy.toString()).toBe("2 items");
  });
});
