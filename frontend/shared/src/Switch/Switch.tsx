/**
 * Switch — boolean toggle with a visible track + thumb.
 *
 * Renders as a `<button role="switch">` so keyboard activation (Space) and
 * screen reader announcement ("Pressed / Not pressed") work naturally. The
 * visual track + thumb animates via CSS transitions; reduced-motion is
 * honored at the token layer (the global token CSS kills durations under
 * ``prefers-reduced-motion``).
 */

import type { CSSProperties, KeyboardEvent } from "react";

export interface SwitchProps {
  /** Current state. */
  checked: boolean;
  /** Called with the new state when the user toggles. */
  onChange: (next: boolean) => void;
  /** Visible label (rendered alongside the switch). */
  label: string;
  /** Render the label before the track (default) or after. */
  labelPosition?: "start" | "end";
  /** Disable interaction. */
  disabled?: boolean;
  /** Optional id (mostly for explicit label coupling in tests). */
  id?: string;
  /** Container className passthrough. */
  className?: string;
  style?: CSSProperties;
}

export function Switch({
  checked,
  onChange,
  label,
  labelPosition = "start",
  disabled = false,
  id,
  className,
  style,
}: SwitchProps): JSX.Element {
  function handleClick(): void {
    if (!disabled) onChange(!checked);
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onChange(!checked);
    }
  }

  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-3, 12px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-body-sm, 14px)",
    color: "var(--ink)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const trackStyle: CSSProperties = {
    width: 36,
    height: 20,
    borderRadius: "var(--r-pill, 999px)",
    background: checked ? "var(--accent)" : "var(--bg-3, var(--bg-2))",
    border: `1px solid ${checked ? "var(--accent)" : "var(--line)"}`,
    position: "relative",
    transition: "background-color 150ms ease, border-color 150ms ease",
    padding: 0,
  };

  const thumbStyle: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: checked ? "var(--accent-ink)" : "var(--ink-soft, var(--ink))",
    position: "absolute",
    top: "50%",
    left: checked ? 18 : 2,
    transform: "translateY(-50%)",
    transition: "left 150ms ease",
  };

  const labelEl = (
    <span style={{ userSelect: "none" }}>{label}</span>
  );

  return (
    <label className={className} style={wrapperStyle} htmlFor={id}>
      {labelPosition === "start" ? labelEl : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        id={id}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKey}
        style={trackStyle}
      >
        <span aria-hidden="true" style={thumbStyle} />
      </button>
      {labelPosition === "end" ? labelEl : null}
    </label>
  );
}
