/**
 * SandboxFrame — H09 reusable card wrapper.
 *
 * Wraps any card so that sandbox content visually cannot be
 * confused with main-vault content: --sandbox-frame border +
 * a `‡ in sandbox` chip in the upper-right.
 */

import type { CSSProperties, ReactNode } from "react";

import { SD_CHIP_GLYPH, SD_IN_SANDBOX_CHIP } from "./copy.js";

export interface SandboxFrameProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function SandboxFrame({
  children,
  className,
  style,
}: SandboxFrameProps) {
  return (
    <div
      data-sandbox-frame
      className={className}
      style={{
        position: "relative",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--sandbox-frame)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <span
        data-field="in-sandbox-chip"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "1px 8px",
          borderRadius: 20,
          background: "var(--sandbox-frame-soft)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--sandbox-frame)",
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          color: "var(--sandbox-frame)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          {SD_CHIP_GLYPH}
        </span>
        {SD_IN_SANDBOX_CHIP}
      </span>
      {children}
    </div>
  );
}
