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
      <div
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
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h2>
        {body ? (
          <div
            id={bodyId}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--type-body-sm, 14px)",
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {body}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2, 8px)",
            marginTop: "var(--space-2, 8px)",
          }}
        >
          <Button variant="quiet" onClick={onCancel}>
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
