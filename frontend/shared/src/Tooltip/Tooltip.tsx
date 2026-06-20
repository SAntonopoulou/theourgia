/**
 * Tooltip — hover/focus-anchored label panel.
 *
 * Wraps a child element and renders a small popover with a text label
 * after a configurable delay on hover. Opens immediately on focus
 * (keyboard users get instant feedback). Closes on hover-out / blur /
 * ESC.
 *
 * Tooltip content is text-only by intent. Rich content goes through
 * Popover.
 */

import {
  type ReactElement,
  type Ref,
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { type Placement, useAnchorPosition } from "../Anchor/useAnchorPosition.js";

export interface TooltipProps {
  label: string;
  children: ReactElement<{
    ref?: Ref<HTMLElement>;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
    "aria-describedby"?: string;
  }>;
  placement?: Placement;
  /** ms before the tooltip appears on hover. Default 400. Use 0 to open immediately. */
  delay?: number;
}

export function Tooltip({ label, children, placement = "top", delay = 400 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const position = useAnchorPosition({
    open,
    triggerRef,
    contentRef,
    placement,
    align: "center",
    offset: 6,
  });

  function clearOpenTimer(): void {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleOpen(immediate: boolean): void {
    clearOpenTimer();
    if (immediate || delay === 0) {
      setOpen(true);
      return;
    }
    timerRef.current = setTimeout(() => {
      setOpen(true);
      timerRef.current = null;
    }, delay);
  }

  function close(): void {
    clearOpenTimer();
    setOpen(false);
  }

  useEffect(() => () => clearOpenTimer(), []);

  // ESC closes (useful when the trigger has keyboard focus).
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const augmented = cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el;
      const incoming = (children as { ref?: Ref<HTMLElement> }).ref;
      if (typeof incoming === "function") incoming(el);
      else if (incoming && "current" in incoming) {
        (incoming as { current: HTMLElement | null }).current = el;
      }
    },
    onMouseEnter: (event: React.MouseEvent) => {
      children.props.onMouseEnter?.(event);
      scheduleOpen(false);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      children.props.onMouseLeave?.(event);
      close();
    },
    onFocus: (event: React.FocusEvent) => {
      children.props.onFocus?.(event);
      scheduleOpen(true);
    },
    onBlur: (event: React.FocusEvent) => {
      children.props.onBlur?.(event);
      close();
    },
    "aria-describedby": open ? tooltipId : undefined,
  });

  const contentVisible = open && position !== null;
  const node = open ? (
    <div
      ref={contentRef}
      id={tooltipId}
      role="tooltip"
      data-placement={position?.placement ?? placement}
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        backgroundColor: "var(--ink, #1a1a1a)",
        color: "var(--bg, #fff)",
        padding: "var(--space-1, 4px) var(--space-2, 8px)",
        borderRadius: "var(--r-sm, 4px)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--type-caption, 11px)",
        lineHeight: 1.4,
        maxWidth: 220,
        pointerEvents: "none",
        zIndex: 1090,
        visibility: contentVisible ? "visible" : "hidden",
      }}
    >
      {label}
    </div>
  ) : null;

  return (
    <>
      {augmented}
      {open && typeof document !== "undefined" ? createPortal(node, document.body) : null}
    </>
  );
}
