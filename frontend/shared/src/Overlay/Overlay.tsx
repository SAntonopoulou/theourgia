/**
 * Overlay — internal primitive powering every focus-trapped dialog/drawer.
 *
 * Renders a portal with a backdrop + a content surface. Handles:
 *   - focus trap (Tab cycling stays within the dialog)
 *   - focus restoration to the trigger on close
 *   - ESC key dismissal (configurable)
 *   - backdrop click dismissal (configurable)
 *   - body scroll lock (reference-counted; supports stacked overlays)
 *   - ARIA wiring (role="dialog" or "alertdialog", aria-modal, labelledby)
 *
 * Not exported from the package barrel — only the specialized dialogs
 * (ConfirmDialog, AlertDialog, PromptDialog, Drawer) are consumer-facing.
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { focusNext, focusPrevious, focusableWithin } from "./focusTrap.js";
import { acquireScrollLock, releaseScrollLock } from "./scrollLock.js";

export type OverlayVariant = "centered" | "drawer-right" | "drawer-left";

export interface OverlayProps {
  open: boolean;
  onClose?: () => void;
  /** Default true. */
  closeOnEsc?: boolean;
  /** Default true. */
  closeOnBackdrop?: boolean;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  /** "dialog" (default) or "alertdialog" for irrevocable warnings. */
  role?: "dialog" | "alertdialog";
  /** Visual geometry. */
  variant?: OverlayVariant;
  /** Width override for drawer variants. */
  drawerWidth?: number;
  /** Content surface className passthrough. */
  className?: string;
  /** Content surface style passthrough. */
  style?: CSSProperties;
  children: ReactNode;
}

export function Overlay({
  open,
  onClose,
  closeOnEsc = true,
  closeOnBackdrop = true,
  ariaLabelledby,
  ariaDescribedby,
  role = "dialog",
  variant = "centered",
  drawerWidth,
  className,
  style,
  children,
}: OverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Acquire / release scroll lock, capture trigger focus, restore on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = typeof document !== "undefined" ? document.activeElement : null;
    acquireScrollLock();
    return () => {
      releaseScrollLock();
      const prev = previousFocusRef.current;
      if (prev instanceof HTMLElement) {
        prev.focus();
      }
    };
  }, [open]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    // Defer to next tick so the portal is in the DOM.
    const id = requestAnimationFrame(() => {
      const focusables = focusableWithin(container);
      if (focusables.length > 0) {
        focusables[0]?.focus();
      } else {
        container.focus();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && closeOnEsc && onClose) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      const container = containerRef.current;
      if (!container) return;
      event.preventDefault();
      const active = document.activeElement;
      if (event.shiftKey) {
        focusPrevious(container, active);
      } else {
        focusNext(container, active);
      }
    }
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (!closeOnBackdrop || !onClose) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!open || typeof document === "undefined") return null;

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "var(--bg-overlay, rgba(0, 0, 0, 0.55))",
    display: "flex",
    alignItems: variant === "centered" ? "center" : "stretch",
    justifyContent:
      variant === "centered" ? "center" : variant === "drawer-right" ? "flex-end" : "flex-start",
    padding: variant === "centered" ? "var(--space-5, 24px)" : 0,
    zIndex: 1000,
  };

  const contentStyle: CSSProperties = (() => {
    const base: CSSProperties = {
      backgroundColor: "var(--bg-2)",
      color: "var(--ink)",
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: "var(--line-2)",
      boxShadow: "0 24px 50px rgba(0, 0, 0, 0.55)",
      maxHeight: "calc(100vh - var(--space-6, 32px))",
      overflow: "auto",
      outline: "none",
      ...style,
    };
    if (variant === "centered") {
      return {
        ...base,
        width: "min(360px, 100%)",
        borderRadius: "var(--r-lg, 14px)",
      };
    }
    const w = drawerWidth ?? (variant === "drawer-right" ? 360 : 280);
    return {
      ...base,
      width: w,
      maxWidth: "100vw",
      maxHeight: "100vh",
      borderRadius: 0,
      ...(variant === "drawer-right" ? { borderRightWidth: 0 } : { borderLeftWidth: 0 }),
    };
  })();

  const node = (
    <div
      style={backdropStyle}
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
      data-theourgia-overlay
    >
      <div
        ref={containerRef}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        tabIndex={-1}
        className={className}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
