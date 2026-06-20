/**
 * SegmentedControl — pill-grouped option toggle.
 *
 * A horizontal row of mutually-exclusive choices, styled like a single
 * pill cut into segments. Used wherever the choice space is small (≤5)
 * and showing every option at once aids decision-making — e.g. visibility
 * rungs on a composer, theme switcher in settings, time-range selector
 * on analytics.
 *
 * Rendered as a `role="radiogroup"` of buttons (not native radio inputs)
 * so the visual treatment can be controlled fully. Arrow keys move
 * selection; Space / Enter activate the focused option; Home / End jump
 * to the ends.
 */

import { type CSSProperties, type KeyboardEvent, useRef } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  glyph?: GlyphName;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Default ``md``. ``sm`` is for dense surfaces (filter rails, toolbars). */
  size?: "sm" | "md";
  /** Stretch to fill the container's width. */
  fullWidth?: boolean;
  /** Accessible group label (use when no visible label is near the control). */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SIZE_HEIGHT: Record<"sm" | "md", number> = { sm: 28, md: 36 };
const SIZE_PADDING: Record<"sm" | "md", string> = {
  sm: "var(--space-1, 4px) var(--space-3, 12px)",
  md: "var(--space-2, 8px) var(--space-4, 16px)",
};
const SIZE_FONT: Record<"sm" | "md", string> = {
  sm: "var(--type-ui, 12px)",
  md: "var(--type-body-sm, 13px)",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth = false,
  ariaLabel,
  disabled = false,
  className,
  style,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusAt(index: number): void {
    const target = refs.current[index];
    target?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (disabled) return;
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        const next = index === last ? 0 : index + 1;
        const opt = options[next];
        if (opt) {
          onChange(opt.value);
          focusAt(next);
        }
        return;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        const next = index === 0 ? last : index - 1;
        const opt = options[next];
        if (opt) {
          onChange(opt.value);
          focusAt(next);
        }
        return;
      }
      case "Home": {
        event.preventDefault();
        const opt = options[0];
        if (opt) {
          onChange(opt.value);
          focusAt(0);
        }
        return;
      }
      case "End": {
        event.preventDefault();
        const opt = options[last];
        if (opt) {
          onChange(opt.value);
          focusAt(last);
        }
        return;
      }
      default:
        return;
    }
  }

  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    padding: 2,
    gap: 2,
    backgroundColor: "var(--bg)",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "var(--line)",
    borderRadius: "var(--r-md, 8px)",
    width: fullWidth ? "100%" : undefined,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  function segmentStyle(selected: boolean): CSSProperties {
    return {
      flex: fullWidth ? 1 : undefined,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-1, 4px)",
      minHeight: SIZE_HEIGHT[size],
      padding: SIZE_PADDING[size],
      fontFamily: "var(--font-ui, system-ui, sans-serif)",
      fontSize: SIZE_FONT[size],
      fontWeight: 500,
      borderRadius: "var(--r-sm, 6px)",
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: selected ? "var(--line-2, var(--line))" : "transparent",
      backgroundColor: selected ? "var(--accent-soft, var(--bg-2))" : "transparent",
      color: selected ? "var(--ink)" : "var(--ink-mute)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease",
    };
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={className}
      style={wrapperStyle}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => handleKey(event, i)}
            style={segmentStyle(selected)}
          >
            {opt.glyph ? <Glyph name={opt.glyph} size={size === "sm" ? 12 : 14} /> : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
