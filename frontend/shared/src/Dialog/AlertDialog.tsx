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
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <span style={{ color: TONE_COLOR[tone], flex: "none" }}>
            <Glyph name={glyph ?? TONE_GLYPH[tone]} size={22} />
          </span>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 20,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
        </div>
        {body ? (
          <p
            id={bodyId}
            style={{
              margin: "0 0 18px",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            {body}
          </p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onAcknowledge}>
            {acknowledgeLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
