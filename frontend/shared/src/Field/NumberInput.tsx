/**
 * NumberInput — numeric input.
 *
 * Same Field-aware wiring as TextInput. ``inputMode="numeric"`` so mobile
 * keyboards open as numeric; ``step`` / ``min`` / ``max`` pass through to
 * native validation.
 */

import type { CSSProperties, InputHTMLAttributes } from "react";

import { useField } from "./Field.js";

export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size">;

export function NumberInput({ className, style, ...rest }: NumberInputProps) {
  const field = useField();
  const invalid = field?.invalid ?? false;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    minHeight: 40,
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "var(--type-body-sm, 14px)",
    color: "var(--ink)",
    backgroundColor: "var(--bg-sunk, var(--bg))",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: invalid ? "var(--danger)" : "var(--line)",
    borderRadius: "var(--r-md, 6px)",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    textAlign: "right",
    ...style,
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      id={rest.id ?? field?.inputId}
      aria-describedby={rest["aria-describedby"] ?? field?.describedById}
      aria-invalid={rest["aria-invalid"] ?? (invalid || undefined)}
      aria-required={rest["aria-required"] ?? (field?.required || undefined)}
      className={className}
      style={inputStyle}
      {...rest}
    />
  );
}
