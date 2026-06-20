/**
 * Chip — pill-shaped tag / filter.
 *
 * Three usage modes:
 *
 * 1. **Display chip** — bare label + optional glyph; ``onToggle`` omitted.
 *    Rendered as a non-interactive span; used for category badges, motif
 *    tags on the synchronicity rail, etc.
 *
 * 2. **Toggle chip** — ``onToggle`` provided. Rendered as a button so
 *    keyboard + screen readers treat it as actionable. ``selected`` drives
 *    the visual state.
 *
 * 3. **Removable chip** — ``removable`` plus ``onToggle`` provided.
 *    Renders an "×" affordance; activating it calls ``onToggle(false)``.
 *    Used in filter rails where the user dismisses an applied chip.
 */

import type { CSSProperties, KeyboardEvent } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export interface ChipProps {
  label: string;
  glyph?: GlyphName;
  /** When defined, the chip becomes interactive. ``onToggle(next)`` fires. */
  onToggle?: (next: boolean) => void;
  /** Required when ``onToggle`` is set — selection drives styling. */
  selected?: boolean;
  /**
   * Show a remove (×) affordance. Activating it calls
   * ``onToggle(false)``. Implies the chip is currently selected.
   */
  removable?: boolean;
  /** Disable interaction (only meaningful when ``onToggle`` is set). */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

function chipStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1, 4px)",
    padding: "var(--space-1, 4px) var(--space-3, 12px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-ui, 13px)",
    color: selected ? "var(--accent-ink)" : "var(--ink)",
    background: selected ? "var(--accent)" : "var(--bg-2)",
    border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "var(--r-pill, 999px)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    userSelect: "none",
    transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease",
  };
}

export function Chip({
  label,
  glyph,
  onToggle,
  selected = false,
  removable = false,
  disabled = false,
  className,
  style,
}: ChipProps) {
  const interactive = Boolean(onToggle);
  const composedStyle: CSSProperties = {
    ...chipStyle(selected, disabled),
    ...style,
  };

  const content = (
    <>
      {glyph ? <Glyph name={glyph} size={14} /> : null}
      <span>{label}</span>
      {removable && interactive ? (
        <span
          aria-hidden="true"
          style={{
            marginLeft: "var(--space-1, 4px)",
            color: selected ? "var(--accent-ink)" : "var(--ink-mute)",
            fontWeight: 600,
          }}
        >
          ×
        </span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <span className={className} style={composedStyle}>
        {content}
      </span>
    );
  }

  function handleClick(): void {
    if (disabled || !onToggle) return;
    onToggle(removable ? false : !selected);
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled || !onToggle) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onToggle(removable ? false : !selected);
    }
  }

  return (
    <button
      type="button"
      role={removable ? "button" : "switch"}
      aria-pressed={!removable ? selected : undefined}
      aria-checked={!removable ? selected : undefined}
      aria-label={removable ? `Remove ${label}` : undefined}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={className}
      style={composedStyle}
    >
      {content}
    </button>
  );
}
