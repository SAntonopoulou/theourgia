/**
 * Select — native single-choice dropdown.
 *
 * Uses the native ``<select>`` element so accessibility + keyboard + mobile
 * pickers Just Work. A fancier combobox / autocomplete lands when the
 * overlay batch ships Popover.
 */

import type { CSSProperties, ReactNode, SelectHTMLAttributes } from "react";

import { useField } from "./Field.js";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "children"> {
  options: readonly SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

export function Select({
  options,
  placeholder,
  className,
  style,
  value,
  defaultValue,
  ...rest
}: SelectProps) {
  const field = useField();
  const invalid = field?.invalid ?? false;

  const selectStyle: CSSProperties = {
    width: "100%",
    minHeight: 38,
    padding: "10px 13px",
    paddingRight: 36,
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: 14,
    color: "var(--ink)",
    backgroundColor: "var(--bg)",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: invalid ? "var(--danger)" : "var(--line-2)",
    borderRadius: "var(--r-md, 8px)",
    outline: "none",
    appearance: "none",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "12px",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M3 5l3 3 3-3'/></svg>\")",
    cursor: "pointer",
    transition: "border-color 150ms ease",
    ...style,
  };

  return (
    <select
      id={rest.id ?? field?.inputId}
      value={value}
      defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
      aria-describedby={rest["aria-describedby"] ?? field?.describedById}
      aria-invalid={rest["aria-invalid"] ?? (invalid || undefined)}
      aria-required={rest["aria-required"] ?? (field?.required || undefined)}
      className={className}
      style={selectStyle}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
