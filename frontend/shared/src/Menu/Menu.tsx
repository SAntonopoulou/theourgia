/**
 * Menu — Popover specialized for action lists.
 *
 * The trigger is supplied as a React element (like Popover). The menu
 * itself manages open state, arrow-key navigation, item activation, and
 * ESC dismissal.
 *
 * Items:
 *
 *   { kind: "item", label, onSelect, glyph?, tone?, disabled? }
 *   { kind: "separator" }
 *   { kind: "label", label }
 */

import {
  type KeyboardEvent,
  type ReactElement,
  type Ref,
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Align, Placement } from "../Anchor/useAnchorPosition.js";
import { Glyph, type GlyphName } from "../Glyph/index.js";
import { Popover } from "../Popover/Popover.js";

export interface MenuItemAction {
  kind: "item";
  label: string;
  onSelect: () => void;
  glyph?: GlyphName;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface MenuSeparator {
  kind: "separator";
}

export interface MenuSectionLabel {
  kind: "label";
  label: string;
}

export type MenuItem = MenuItemAction | MenuSeparator | MenuSectionLabel;

export interface MenuProps {
  trigger: ReactElement<{
    ref?: Ref<HTMLElement>;
    onClick?: (event: React.MouseEvent) => void;
  }>;
  items: readonly MenuItem[];
  placement?: Placement;
  align?: Align;
  /** Width override; defaults to natural content width with a 220px min. */
  width?: number;
  /** ARIA label for the menu (used when no visible heading anchors it). */
  ariaLabel?: string;
}

function actionIndices(items: readonly MenuItem[]): number[] {
  const out: number[] = [];
  items.forEach((item, i) => {
    if (item.kind === "item" && !item.disabled) out.push(i);
  });
  return out;
}

export function Menu({
  trigger,
  items,
  placement = "bottom",
  align = "start",
  width,
  ariaLabel,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const actionable = useMemo(() => actionIndices(items), [items]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Reset focus to the first actionable item when the menu opens.
  useEffect(() => {
    if (!open) return;
    const first = actionable[0];
    if (first !== undefined) {
      setActiveIndex(first);
      // Defer to allow the portal to mount.
      const raf = requestAnimationFrame(() => {
        itemRefs.current[first]?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, actionable]);

  function moveTo(nextIndex: number): void {
    setActiveIndex(nextIndex);
    itemRefs.current[nextIndex]?.focus();
  }

  function handleMenuKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (actionable.length === 0) return;
    const currentPos = actionable.indexOf(activeIndex);
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const nextPos = currentPos === actionable.length - 1 ? 0 : currentPos + 1;
        const nextIdx = actionable[nextPos];
        if (nextIdx !== undefined) moveTo(nextIdx);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        const nextPos = currentPos <= 0 ? actionable.length - 1 : currentPos - 1;
        const nextIdx = actionable[nextPos];
        if (nextIdx !== undefined) moveTo(nextIdx);
        return;
      }
      case "Home": {
        event.preventDefault();
        const firstIdx = actionable[0];
        if (firstIdx !== undefined) moveTo(firstIdx);
        return;
      }
      case "End": {
        event.preventDefault();
        const lastIdx = actionable[actionable.length - 1];
        if (lastIdx !== undefined) moveTo(lastIdx);
        return;
      }
      case "Tab":
        // Close on Tab so focus moves out naturally.
        close();
        return;
      default:
        return;
    }
  }

  const augmentedTrigger = cloneElement(trigger, {
    onClick: (event: React.MouseEvent) => {
      const incoming = trigger.props.onClick;
      if (typeof incoming === "function") incoming(event);
      setOpen((prev) => !prev);
    },
  });

  return (
    <Popover
      open={open}
      onClose={close}
      trigger={augmentedTrigger}
      placement={placement}
      align={align}
      role="menu"
      width={width}
    >
      <div
        aria-label={ariaLabel}
        onKeyDown={handleMenuKey}
        style={{
          padding: "var(--space-2, 8px)",
          minWidth: width ?? 220,
          fontFamily: "var(--font-ui, system-ui, sans-serif)",
          fontSize: "var(--type-body-sm, 14px)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((item, i) => {
          if (item.kind === "separator") {
            return (
              <hr
                // biome-ignore lint/suspicious/noArrayIndexKey: separators have no stable id; position is the identity
                key={`sep-${i}`}
                style={{
                  height: 1,
                  backgroundColor: "var(--line)",
                  border: "none",
                  margin: "var(--space-1, 4px) 0",
                }}
              />
            );
          }
          if (item.kind === "label") {
            return (
              <div
                key={`label-${i}-${item.label}`}
                style={{
                  padding: "var(--space-1, 4px) var(--space-3, 12px)",
                  fontSize: "var(--type-caption, 11px)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink-mute)",
                }}
              >
                {item.label}
              </div>
            );
          }
          const isDanger = item.tone === "danger";
          return (
            <button
              key={`item-${i}-${item.label}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={i === activeIndex ? 0 : -1}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                close();
              }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2, 8px)",
                padding: "var(--space-2, 8px) var(--space-3, 12px)",
                background: "transparent",
                borderRadius: "var(--r-sm, 4px)",
                borderStyle: "solid",
                borderWidth: "1px",
                borderColor: "transparent",
                color: isDanger ? "var(--danger)" : "var(--ink)",
                cursor: item.disabled ? "not-allowed" : "pointer",
                opacity: item.disabled ? 0.5 : 1,
                textAlign: "left",
                font: "inherit",
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--accent-soft, var(--bg-3, var(--bg-2)))";
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.glyph ? <Glyph name={item.glyph} size={14} /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
