/**
 * Theourgia first-paint theme script.
 *
 * Inline this at the very top of every HTML document (before any framework
 * hydrates) so the right `data-*` attributes land on <html> before the first
 * paint — preventing a flash from default (base / dark) to the user's
 * persisted preference.
 *
 * Reads four keys from localStorage:
 *   theourgia.theme    — "base" | "hellenic" | "thelemic"
 *   theourgia.mode     — "dark" | "light"
 *   theourgia.contrast — "normal" | "high"
 *   theourgia.cvd      — "normal" | "safe"
 *
 * Any value missing or outside the allow-list falls through to the documented
 * default. Total payload is tiny (≈800 bytes minified); inline it directly
 * instead of fetching, so it runs before the first paint pipeline.
 *
 * After login, the app should rehydrate from the user's S10 settings
 * (`ui.theme`, `ui.mode`, `a11y.high_contrast`, `a11y.cvd_safe`) and mirror
 * the result back to localStorage so the next first-paint matches.
 */
(() => {
  if (typeof document === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  var root = document.documentElement;
  function pick(key, allowed, fallback) {
    try {
      var v = localStorage.getItem("theourgia." + key);
      return allowed.indexOf(v) >= 0 ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }
  root.setAttribute("data-theme", pick("theme", ["base", "hellenic", "thelemic"], "base"));
  root.setAttribute("data-mode", pick("mode", ["dark", "light"], "dark"));
  root.setAttribute("data-contrast", pick("contrast", ["normal", "high"], "normal"));
  root.setAttribute("data-cvd", pick("cvd", ["normal", "safe"], "normal"));
})();
