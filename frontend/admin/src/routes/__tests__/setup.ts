/**
 * Vitest setup for admin route smoke tests (b108-2gm).
 *
 * Wires @testing-library/jest-dom's custom matchers + provides a
 * minimal window.crypto polyfill (some routes call crypto.randomUUID).
 */

import "@testing-library/jest-dom/vitest";

// jsdom lacks crypto.randomUUID; polyfill with a Math.random shim.
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  Object.defineProperty(crypto, "randomUUID", {
    value: () =>
      "test-" +
      Math.random().toString(16).slice(2, 10) +
      "-" +
      Date.now().toString(16),
    configurable: true,
  });
}
