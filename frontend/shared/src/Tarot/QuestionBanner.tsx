/**
 * QuestionBanner — the italic question banner above the board.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 119-123. The ❖ glyph
 * sits in --div (the divinatory accent); the question reads in
 * italic display serif; an Edit button on the right opens the
 * editor (in scope of the surface, not this component).
 */

import { type CSSProperties } from "react";

export interface QuestionBannerProps {
  question: string;
  onEdit?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function QuestionBanner({
  question,
  onEdit,
  className,
  style,
}: QuestionBannerProps) {
  return (
    <div
      data-component="question-banner"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-glyph)",
          color: "var(--div)",
          fontSize: 16,
          flex: "none",
        }}
      >
        ❖
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 17,
          color: "var(--ink)",
        }}
      >
        {question}
      </span>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            flex: "none",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}
