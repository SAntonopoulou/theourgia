/**
 * ConfirmDialog — themed yes/no confirmation.
 *
 * The hard rule from `agent_onboarding.md`: never use the native
 * confirm() dialog. This is the themed replacement, focus-trapped,
 * ESC-dismissible, screen-reader-correct.
 *
 * Three tones:
 *   destructive — oxblood confirm; for deletes / revokes / archive
 *   constructive — accent confirm; for affirmative actions
 *   neutral — secondary confirm; for low-stakes choices
 */

import { type ReactNode, useId } from "react";

import { Button } from "../Button/index.js";
import { Overlay } from "../Overlay/Overlay.js";

export type ConfirmTone = "destructive" | "constructive" | "neutral";

export interface ConfirmDialogProps {
  open: boolean;
  tone?: ConfirmTone;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  tone = "neutral",
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();

  const confirmVariant =
    tone === "destructive" ? "danger" : tone === "constructive" ? "primary" : "secondary";

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      ariaLabelledby={titleId}
      ariaDescribedby={body ? bodyId : undefined}
    >
      <div style={{ padding: 22 }}>
        <h2
          id={titleId}
          style={{
            margin: "0 0 8px",
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 21,
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {body ? (
          <p
            id={bodyId}
            style={{
              margin: "0 0 20px",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            {body}
          </p>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
