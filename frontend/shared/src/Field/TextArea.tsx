/**
 * TextArea — multi-line text input.
 *
 * Same Field-aware wiring as TextInput. Pass `rows` for a fixed height or
 * `autoGrow` to expand with content (capped at `maxRows`).
 */

import { type CSSProperties, type TextareaHTMLAttributes, useEffect, useRef } from "react";

import { useField } from "./Field.js";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Expand the textarea as content grows. Bounded by ``maxRows``. */
  autoGrow?: boolean;
  /** Cap on autoGrow expansion. Default 12. */
  maxRows?: number;
}

export function TextArea({
  className,
  style,
  rows = 3,
  autoGrow = false,
  maxRows = 12,
  value,
  defaultValue,
  ...rest
}: TextAreaProps) {
  const field = useField();
  const invalid = field?.invalid ?? false;
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: value is the trigger for re-measuring; ref.current is a stable handle
  useEffect(() => {
    if (!autoGrow) return;
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight || "20");
    const max = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [autoGrow, maxRows, value]);

  const composedStyle: CSSProperties = {
    width: "100%",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-body-sm, 14px)",
    lineHeight: 1.5,
    color: "var(--ink)",
    backgroundColor: "var(--bg-sunk, var(--bg))",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: invalid ? "var(--danger)" : "var(--line)",
    borderRadius: "var(--r-md, 6px)",
    resize: autoGrow ? "none" : "vertical",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    ...style,
  };

  return (
    <textarea
      ref={ref}
      id={rest.id ?? field?.inputId}
      rows={rows}
      value={value}
      defaultValue={defaultValue}
      aria-describedby={rest["aria-describedby"] ?? field?.describedById}
      aria-invalid={rest["aria-invalid"] ?? (invalid || undefined)}
      aria-required={rest["aria-required"] ?? (field?.required || undefined)}
      className={className}
      style={composedStyle}
      {...rest}
    />
  );
}
