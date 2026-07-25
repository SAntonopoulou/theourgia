/**
 * SimulatedThrowBar — the RNG affordance, visually separated behind a
 * dashed frame (rule 67). The copy says plainly that a simulated cast
 * is marked simulated in the history for as long as it is kept.
 */

import type { CSSProperties } from "react";

import { _ } from "../i18n/index.js";

export interface SimulatedThrowBarProps {
  onSimulate: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DICE_ICON = (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export function SimulatedThrowBar({
  onSimulate,
  disabled,
  className,
  style,
}: SimulatedThrowBarProps) {
  return (
    <div
      data-component="simulated-throw-bar"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 15px",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-md, 8px)",
        flexWrap: "wrap",
        ...style,
      }}
    >
      <span style={{ display: "flex", color: "var(--ink-mute)", flex: "none" }}>{DICE_ICON}</span>
      <div
        style={{
          flex: 1,
          minWidth: 200,
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        {_(
          "No bones to hand? A simulated throw is available, and every cast made this way is marked as simulated in your history for as long as it is kept.",
        )}
      </div>
      <button
        type="button"
        data-action="simulate"
        onClick={onSimulate}
        disabled={disabled}
        style={{
          padding: "8px 14px",
          borderRadius: "var(--r-md, 8px)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          background: "transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          flex: "none",
          cursor: disabled ? "default" : "pointer",
          minHeight: 34,
        }}
      >
        {_("Simulate a throw")}
      </button>
    </div>
  );
}

/** The forever-mark carried by simulated casts in history and results. */
export function SimulatedChip({ style }: { style?: CSSProperties }) {
  return (
    <span
      data-simulated-chip
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        color: "var(--ink-mute)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-pill, 20px)",
        padding: "1px 8px",
        flex: "none",
        ...style,
      }}
    >
      {_("simulated")}
    </span>
  );
}
