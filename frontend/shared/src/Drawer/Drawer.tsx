/**
 * Drawer — side-anchored modal panel.
 *
 * Structurally identical to a centered dialog (focus trap, ESC, scroll
 * lock, backdrop) but slides in from an edge. Used for settings panels,
 * entity detail views, mobile sidebars.
 */

import { type ReactNode, useId } from "react";

import { Button } from "../Button/index.js";
import { Overlay } from "../Overlay/Overlay.js";

export interface DrawerProps {
  open: boolean;
  side?: "left" | "right";
  title: ReactNode;
  onClose: () => void;
  /** Default 360 right / 280 left. */
  width?: number;
  /** Default true. Drawers with unsaved-form state often set this to false. */
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  children: ReactNode;
}

export function Drawer({
  open,
  side = "right",
  title,
  onClose,
  width,
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
}: DrawerProps) {
  const titleId = useId();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEsc={closeOnEsc}
      ariaLabelledby={titleId}
      variant={side === "left" ? "drawer-left" : "drawer-right"}
      drawerWidth={width}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              color: "var(--ink)",
            }}
          >
            {title}
          </h2>
          <Button size="sm" variant="quiet" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>{children}</div>
      </div>
    </Overlay>
  );
}
