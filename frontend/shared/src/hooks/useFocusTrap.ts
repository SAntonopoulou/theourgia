/**
 * useFocusTrap — traps Tab/Shift+Tab focus inside the referenced
 * container element while `open` is true (b108-2gj a11y sweep).
 *
 * WAI-ARIA modal contract §5: focus MUST NOT leave the modal via Tab
 * while it's open — including reaching browser chrome. Wraps back
 * to the first focusable on Tab-from-last, and to last on Shift+Tab-
 * from-first.
 *
 * Usage:
 *
 *   const panelRef = useRef<HTMLDivElement | null>(null);
 *   useFocusTrap(panelRef, open);
 *
 *   <div role="dialog" ref={panelRef} …>
 *
 * Cooperates with useEscapeToClose + useFocusOnOpen from the same
 * hooks package — a single modal can (and should) install all three.
 */

import { useEffect, type RefObject } from "react";

import { focusNext, focusPrevious, focusableWithin } from "../Overlay/focusTrap.js";

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  open: boolean,
): void {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = focusableWithin(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        focusPrevious(container, active);
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        focusNext(container, active);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, containerRef]);
}
