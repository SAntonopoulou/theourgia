/**
 * Reference-counted body-scroll lock.
 *
 * Multiple overlays can open simultaneously (a PromptDialog opened from
 * inside a ConfirmDialog, for example). The first opener locks, every
 * subsequent opener bumps the count, every closer decrements. Only the
 * last closer restores the original ``body.style.overflow``.
 */

let lockCount = 0;
let savedOverflow: string | null = null;

export function acquireScrollLock(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function releaseScrollLock(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow ?? "";
    savedOverflow = null;
  }
}

/** Test helper — reset internal state between tests. */
export function _resetScrollLock(): void {
  lockCount = 0;
  savedOverflow = null;
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}
