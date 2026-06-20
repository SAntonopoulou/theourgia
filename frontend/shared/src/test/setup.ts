/**
 * Vitest global setup. Loaded once before every test file.
 *
 * - Adds @testing-library/jest-dom custom matchers (toBeInTheDocument, etc.)
 * - Polyfills localStorage / sessionStorage — happy-dom 15.x does not provide
 *   them, and Node's experimental localStorage requires a CLI flag.
 */
import "@testing-library/jest-dom/vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const g = globalThis as Record<string, unknown>;
if (typeof g.localStorage === "undefined") g.localStorage = new MemoryStorage();
if (typeof g.sessionStorage === "undefined") g.sessionStorage = new MemoryStorage();
