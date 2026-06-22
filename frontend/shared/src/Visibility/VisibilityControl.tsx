/**
 * VisibilityControl — 4-pill segmented control for entry visibility.
 *
 * Per `Theourgia Visibility.dc.html`. The pills sit Personal →
 * Viewer → Hub → Public left-to-right; each shows a tinted dot in
 * its `--vis-*` colour and the human label. The active pill gets
 * an outline + filled background.
 *
 * Behaviour rule (the surface invariant):
 *   - Clicking a MORE PRIVATE pill (lower index) → fires `onChange`
 *     immediately. Raising privacy never needs confirmation.
 *   - Clicking a MORE PUBLIC pill (higher index) → fires
 *     `onRequestDowngrade(target)` and DOES NOT change value. The
 *     caller is responsible for showing `VisibilityDowngradeDialog`
 *     and then calling the value setter on confirm.
 *   - Clicking the current pill is a no-op.
 *
 * The pill `title` attribute carries a per-direction hint:
 *   - "More private — applies at once"
 *   - "More public — confirms first"
 *   - "Current"
 */

import { type CSSProperties } from "react";

import type { EntityVisibility } from "../api/types.js";
import {
  VISIBILITY_META,
  VISIBILITY_ORDER,
  isDowngrade,
  visibilityIndex,
} from "./visibility.js";

export interface VisibilityControlProps {
  value: EntityVisibility;
  /** Called when the user picks a MORE PRIVATE pill (always safe). */
  onChange?: (next: EntityVisibility) => void;
  /** Called when the user picks a MORE PUBLIC pill (caller must confirm). */
  onRequestDowngrade?: (target: EntityVisibility) => void;
  /** When true, all pills are disabled. */
  disabled?: boolean;
  /** Optional ARIA label for the group (defaults to "Visibility"). */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

function pillStyle(on: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 11.5,
    color: on ? "var(--ink)" : "var(--ink-mute)",
    background: on ? "var(--bg-2)" : "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: on ? "var(--line-2)" : "transparent",
    transition: "all 0.15s ease",
    cursor: "pointer",
  };
}

export function VisibilityControl({
  value,
  onChange,
  onRequestDowngrade,
  disabled = false,
  ariaLabel = "Visibility",
  className,
  style,
}: VisibilityControlProps) {
  function direction(target: EntityVisibility): string {
    if (target === value) return "Current";
    return isDowngrade(value, target)
      ? "More public — confirms first"
      : "More private — applies at once";
  }

  function handlePick(target: EntityVisibility) {
    if (disabled || target === value) return;
    if (visibilityIndex(target) < visibilityIndex(value)) {
      onChange?.(target);
    } else {
      onRequestDowngrade?.(target);
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={className}
      data-component="visibility-control"
      data-value={value}
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: 999,
        background: "var(--bg-sunk)",
        ...style,
      }}
    >
      {VISIBILITY_ORDER.map((level) => {
        const meta = VISIBILITY_META[level];
        const on = value === level;
        return (
          <button
            key={level}
            type="button"
            data-visibility-level={level}
            data-visibility-active={on ? "true" : "false"}
            aria-pressed={on}
            disabled={disabled}
            title={direction(level)}
            onClick={() => handlePick(level)}
            style={pillStyle(on)}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: meta.color,
                flex: "none",
              }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
