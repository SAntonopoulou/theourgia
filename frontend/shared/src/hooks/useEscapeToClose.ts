/**
 * useEscapeToClose — WAI-ARIA modal-pattern helper (b108-2fy a11y sweep).
 *
 * Standard modal-a11y contract: Escape closes the current top-level
 * modal. React 19's `useEffect` cleanup handles component unmount and
 * `open` transitions; no observable listener stays attached.
 *
 * Usage:
 *
 *   useEscapeToClose(open, onClose);
 *
 * Silently no-ops when `open` is false. The bound handler captures
 * `onClose` from a ref-stable identity, so passing an inline lambda
 * doesn't churn listener registration.
 */

import { useEffect } from "react";

export function useEscapeToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}
