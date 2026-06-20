/**
 * Popover — generic anchored floating panel.
 *
 * The trigger is supplied as a React element; Popover clones it with a
 * ref + the right ARIA attributes (`aria-expanded`, `aria-haspopup`,
 * `aria-controls`). Content is portaled into ``document.body`` and
 * positioned via the shared anchor engine.
 *
 * Consumer owns ``open`` + ``onClose``. The popover dismisses on:
 *   - ESC (configurable)
 *   - click outside trigger + content (configurable)
 *   - the parent flipping ``open`` to false
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  cloneElement,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { type Align, type Placement, useAnchorPosition } from "../Anchor/useAnchorPosition.js";
import { useClickOutside } from "../Anchor/useClickOutside.js";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactElement<{
    ref?: Ref<HTMLElement>;
    "aria-expanded"?: boolean;
    "aria-haspopup"?: string;
    "aria-controls"?: string;
  }>;
  placement?: Placement;
  align?: Align;
  offset?: number;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
  /** ARIA role of the floating content. Default "dialog". Menus override. */
  role?: "dialog" | "menu" | "listbox" | "tooltip";
  /** Width override (px). When unset, content sizes naturally. */
  width?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Popover({
  open,
  onClose,
  trigger,
  placement = "bottom",
  align = "start",
  offset = 4,
  closeOnEsc = true,
  closeOnOutside = true,
  role = "dialog",
  width,
  className,
  style,
  children,
}: PopoverProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();

  const position = useAnchorPosition({
    open,
    triggerRef,
    contentRef,
    placement,
    align,
    offset,
  });

  useClickOutside([triggerRef, contentRef], onClose, open && closeOnOutside);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  const triggerProps: Record<string, unknown> = {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el;
      // Forward to any existing ref the caller may have set on the element.
      const incoming = (trigger as { ref?: Ref<HTMLElement> }).ref;
      if (typeof incoming === "function") incoming(el);
      else if (incoming && "current" in incoming) {
        (incoming as { current: HTMLElement | null }).current = el;
      }
    },
    "aria-expanded": open,
    "aria-haspopup": role,
    "aria-controls": open ? contentId : undefined,
  };

  const clonedTrigger = cloneElement(trigger, triggerProps);

  function handleContentKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && closeOnEsc) {
      event.stopPropagation();
      onClose();
    }
  }

  const contentVisible = open && position !== null;
  const baseContentStyle: CSSProperties = {
    position: "fixed",
    top: position?.top ?? 0,
    left: position?.left ?? 0,
    width,
    backgroundColor: "var(--bg-2)",
    color: "var(--ink)",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "var(--line)",
    borderRadius: "var(--r-md, 8px)",
    boxShadow: "var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.18))",
    zIndex: 1050,
    // Hidden until measured so we don't flash at (0, 0).
    visibility: contentVisible ? "visible" : "hidden",
    ...style,
  };

  // Render the content as soon as `open` flips, so the anchor engine has
  // a real DOM node to measure on the next frame.
  const content = open ? (
    <div
      ref={contentRef}
      id={contentId}
      role={role}
      data-placement={position?.placement ?? placement}
      onKeyDown={handleContentKey}
      className={className}
      style={baseContentStyle}
    >
      {children}
    </div>
  ) : null;

  return (
    <>
      {clonedTrigger}
      {open && typeof document !== "undefined" ? createPortal(content, document.body) : null}
    </>
  );
}
