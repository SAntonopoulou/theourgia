/**
 * Field — label + control + hint/error wrapper.
 *
 * Field owns the accessibility wiring that an ``<input>`` alone can't carry:
 * the ``<label>``-to-input association, the ``aria-describedby`` linking to
 * the hint, the ``aria-invalid`` flip when an error is present, and the
 * required-marker rendering. Form primitives (``TextInput``, ``TextArea``,
 * ``Select``, ``NumberInput``) consume a Field-provided context so they
 * never have to recreate this wiring.
 *
 * Usage::
 *
 *     <Field label="Email" hint="We never share it." required>
 *       <TextInput type="email" />
 *     </Field>
 */

import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
} from "react";

export interface FieldProps {
  /** Visible label text. */
  label: ReactNode;
  /** Inline help text rendered below the input. */
  hint?: ReactNode;
  /** Error message — when present, the field is marked invalid. */
  error?: ReactNode;
  /** Renders a small required indicator on the label. */
  required?: boolean;
  /** Layout id (auto-generated if omitted). */
  id?: string;
  /** Container className passthrough. */
  className?: string;
  /** Container style passthrough. */
  style?: CSSProperties;
  /** The control (TextInput / TextArea / Select / etc.). */
  children: ReactNode;
}

interface FieldContextValue {
  inputId: string;
  describedById?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Hook used by Field-aware inputs to pick up the wiring. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}

export function Field({
  label,
  hint,
  error,
  required = false,
  id,
  className,
  style,
  children,
}: FieldProps) {
  const reactId = useId();
  const inputId = id ?? `field-${reactId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedById = errorId ?? hintId;

  const context: FieldContextValue = {
    inputId,
    describedById,
    errorId,
    invalid: Boolean(error),
    required,
  };

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    ...style,
  };

  const labelStyle: CSSProperties = {
    fontSize: "var(--type-ui, 13px)",
    color: "var(--ink-soft)",
    letterSpacing: "0.02em",
  };

  const hintStyle: CSSProperties = {
    fontSize: "var(--type-caption, 11px)",
    color: "var(--ink-mute)",
  };

  const errorStyle: CSSProperties = {
    fontSize: "var(--type-caption, 11px)",
    color: "var(--danger)",
  };

  // If the caller gave us a single React element, clone it with the wiring
  // already applied. Otherwise just render the children — the consumer is
  // responsible for calling useField() themselves.
  const wiredChildren =
    isValidElement(children) && (children.props as { id?: string }).id === undefined
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: inputId,
          "aria-describedby": describedById,
          "aria-invalid": context.invalid || undefined,
          "aria-required": required || undefined,
        })
      : children;

  return (
    <FieldContext.Provider value={context}>
      <div className={className} style={wrapperStyle}>
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required ? (
            <span aria-hidden="true" style={{ color: "var(--danger)" }}>
              {" *"}
            </span>
          ) : null}
        </label>
        {wiredChildren}
        {hint && !error ? (
          <span id={hintId} style={hintStyle}>
            {hint}
          </span>
        ) : null}
        {error ? (
          <span id={errorId} role="alert" style={errorStyle}>
            {error}
          </span>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
