/**
 * Focus trap helpers.
 *
 * Queries the container for focusable descendants and computes the next /
 * previous focus target. The container is responsible for installing a
 * keydown listener; these helpers compute "what to focus next."
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Move focus to the next focusable element inside ``container``, wrapping
 * around from end to start. Returns the element that was focused, or null
 * if nothing focusable exists.
 */
export function focusNext(container: HTMLElement, current: Element | null): HTMLElement | null {
  const focusables = focusableWithin(container);
  if (focusables.length === 0) return null;
  const index = current instanceof HTMLElement ? focusables.indexOf(current) : -1;
  const next = focusables[(index + 1) % focusables.length];
  next?.focus();
  return next ?? null;
}

/** Mirror of focusNext, going backward. */
export function focusPrevious(container: HTMLElement, current: Element | null): HTMLElement | null {
  const focusables = focusableWithin(container);
  if (focusables.length === 0) return null;
  const index = current instanceof HTMLElement ? focusables.indexOf(current) : -1;
  const prev = focusables[(index - 1 + focusables.length) % focusables.length];
  prev?.focus();
  return prev ?? null;
}
