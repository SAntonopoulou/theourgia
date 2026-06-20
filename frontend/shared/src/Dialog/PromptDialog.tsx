/**
 * PromptDialog — themed replacement for window.prompt().
 *
 * Single text input, confirm + cancel. Optional ``validate`` runs on every
 * keystroke; submission is blocked while validate returns a string.
 */

import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Button } from "../Button/index.js";
import { Field, TextInput } from "../Field/index.js";
import { Overlay } from "../Overlay/Overlay.js";

export interface PromptDialogProps {
  open: boolean;
  title: ReactNode;
  label: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  /** Return an error string to block submit, or null when valid. */
  validate?: (value: string) => string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  label,
  defaultValue = "",
  placeholder,
  validate,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const titleId = useId();
  const [value, setValue] = useState(defaultValue);
  const error = validate ? validate(value) : null;

  // Reset when re-opened so a re-open after cancel doesn't keep the last value.
  function handleCancel(): void {
    setValue(defaultValue);
    onCancel();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (error) return;
    onSubmit(value);
    setValue(defaultValue);
  }

  return (
    <Overlay open={open} onClose={handleCancel} ariaLabelledby={titleId}>
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "var(--space-5, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4, 16px)",
        }}
      >
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--type-h2, 22px)",
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        <Field label={label} error={error ?? undefined}>
          <TextInput
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </Field>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2, 8px)",
            marginTop: "var(--space-2, 8px)",
          }}
        >
          <Button type="button" variant="quiet" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="primary" disabled={Boolean(error)}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
