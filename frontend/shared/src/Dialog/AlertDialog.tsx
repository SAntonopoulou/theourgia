/**
 * AlertDialog — irrevocable acknowledgement.
 *
 * Single-button dialog the user must acknowledge. Used for encryption
 * warnings, "this cannot be undone" notices — anywhere there is no
 * "cancel" path. Rendered as `role="alertdialog"` for screen readers.
 *
 * Three tones, glyph-paired per the color-never-alone rule:
 *   warning — caveat / advisory (default)
 *   danger — destructive consequence
 *   info — informational; usually paired with a constructive choice
 */

import { type ReactNode, useId } from "react";

import { Button } from "../Button/index.js";
import { Glyph, type GlyphName } from "../Glyph/index.js";
import { Overlay } from "../Overlay/Overlay.js";

export type AlertTone = "warning" | "danger" | "info";

export interface AlertDialogProps {
  open: boolean;
  tone?: AlertTone;
  title: ReactNode;
  body?: ReactNode;
  acknowledgeLabel: string;
  onAcknowledge: () => void;
  /** Override the auto-selected glyph. */
  glyph?: GlyphName;
  /** Allow ESC dismiss + backdrop dismiss. Defaults to false for alerts. */
  dismissible?: boolean;
}

const TONE_GLYPH: Record<AlertTone, GlyphName> = {
  warning: "bell",
  danger: "lock",
  info: "scroll",
};

const TONE_COLOR: Record<AlertTone, string> = {
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

export function AlertDialog({
  open,
  tone = "warning",
  title,
  body,
  acknowledgeLabel,
  onAcknowledge,
  glyph,
  dismissible = false,
}: AlertDialogProps) {
  const titleId = useId();
  const bodyId = useId();

  return (
    <Overlay
      role="alertdialog"
      open={open}
      onClose={dismissible ? onAcknowledge : undefined}
      closeOnEsc={dismissible}
      closeOnBackdrop={dismissible}
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3, 12px)" }}>
          <span style={{ color: TONE_COLOR[tone] }}>
            <Glyph name={glyph ?? TONE_GLYPH[tone]} size={24} />
          </span>
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
        </div>
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
          style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2, 8px)" }}
        >
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onAcknowledge}>
            {acknowledgeLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
