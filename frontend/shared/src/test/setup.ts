/**
 * Vitest global setup. Loaded once before every test file.
 *
 * Adds the @testing-library/jest-dom custom matchers so tests can use
 * ``expect(element).toBeInTheDocument()`` and friends.
 */
import "@testing-library/jest-dom/vitest";
