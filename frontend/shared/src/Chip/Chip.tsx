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
  // Matches the design's `[data-chip][aria-pressed="true"]` rule in
  // theourgia.shared.css: idle = line/ink-soft on transparent; selected =
  // accent-soft + line-2 + ink.
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 12px",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: 12.5,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
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
            marginLeft: 4,
            color: "var(--ink-mute)",
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
      <span className={className} style={composedStyle} data-chip>
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
      data-chip
      role={removable ? "button" : "switch"}
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
