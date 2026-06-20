/**
 * TextInput — single-line text input.
 *
 * Designed to live inside a ``<Field>`` (which provides the id +
 * aria-describedby + aria-invalid + aria-required wiring) but works
 * standalone too.
 */

import type { CSSProperties, InputHTMLAttributes } from "react";

import { useField } from "./Field.js";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export function TextInput({ className, style, ...rest }: TextInputProps) {
  const field = useField();
  const invalid = field?.invalid ?? false;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    minHeight: 40,
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: "var(--type-body-sm, 14px)",
    color: "var(--ink)",
    background: "var(--bg-sunk, var(--bg))",
    border: `1px solid ${invalid ? "var(--danger)" : "var(--line)"}`,
    borderRadius: "var(--r-md, 6px)",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    ...style,
  };

  return (
    <input
      type={rest.type ?? "text"}
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
