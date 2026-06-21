import { afterEach, describe, expect, it } from "vitest";

import {
  _,
  _lazy,
  _n,
  _n_lazy,
  availableLocales,
  gettext,
  getMeta,
  ngettext,
  negotiateLocale,
  registerCatalog,
  setCurrentLocale,
} from "./index.js";

afterEach(() => {
  // Tests share module state — reset to default English between cases.
  setCurrentLocale("en");
});

describe("frontend i18n — English passthrough (regression)", () => {
  it("gettext returns the source string when no translation exists", () => {
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

describe("frontend i18n — Modern Greek catalog (round-trip)", () => {
  it("returns the Greek translation for a known key", () => {
    setCurrentLocale("el");
    expect(gettext("Welcome")).toBe("Καλώς ήρθες");
    expect(gettext("Today")).toBe("Σήμερα");
  });

  it("interpolates inside translated strings", () => {
    setCurrentLocale("el");
    expect(gettext("Hello, {name}!", { name: "Σοφία" })).toBe("Γεια σου, Σοφία!");
  });

  it("falls back to the source string when no translation exists", () => {
    setCurrentLocale("el");
    expect(gettext("an entirely untranslated string")).toBe("an entirely untranslated string");
  });

  it("plural forms work via the Greek catalog", () => {
    setCurrentLocale("el");
    expect(ngettext("{n} entry", "{n} entries", 1)).toBe("1 καταχώρηση");
    expect(ngettext("{n} entry", "{n} entries", 4)).toBe("4 καταχωρήσεις");
  });

  it("lazy strings re-translate after a locale switch", () => {
    const lazy = _lazy("Welcome");
    setCurrentLocale("en");
    expect(lazy.toString()).toBe("Welcome");
    setCurrentLocale("el");
    expect(lazy.toString()).toBe("Καλώς ήρθες");
  });
});

describe("frontend i18n — Hebrew catalog (RTL spot-check)", () => {
  it("returns the Hebrew translation for a known key", () => {
    setCurrentLocale("he");
    expect(gettext("Welcome")).toBe("ברוך בואך");
  });

  it("meta carries dir: rtl for Hebrew", () => {
    expect(getMeta("he")?.dir).toBe("rtl");
    expect(getMeta("en")?.dir).toBe("ltr");
    expect(getMeta("el")?.dir).toBe("ltr");
  });
});

describe("frontend i18n — locale registry", () => {
  it("availableLocales reports the registered set", () => {
    const ids = availableLocales().map((m) => m.locale);
    expect(ids).toContain("en");
    expect(ids).toContain("el");
    expect(ids).toContain("he");
  });

  it("negotiateLocale matches the user's most preferred available", () => {
    expect(negotiateLocale(["zh-CN", "el", "en"])).toBe("el");
    expect(negotiateLocale(["el-GR"])).toBe("el");
    expect(negotiateLocale(["nope"])).toBe("en");
  });

  it("registerCatalog adds a new locale at runtime", () => {
    registerCatalog("xx", {
      $meta: { locale: "xx", name: "Test", dir: "ltr", pluralCategories: ["other"] },
      Welcome: "Heyy",
    });
    setCurrentLocale("xx");
    expect(gettext("Welcome")).toBe("Heyy");
  });
});
