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
    padding: "10px 13px",
    minHeight: 38,
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: 14,
    color: "var(--ink)",
    background: "var(--bg)",
    border: `1px solid ${invalid ? "var(--danger)" : "var(--line-2)"}`,
    borderRadius: "var(--r-md, 8px)",
    outline: "none",
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
